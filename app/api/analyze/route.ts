import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const fileMetadataStr = formData.get('fileMetadata') as string
    const configStr = formData.get('config') as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    if (!configStr) {
      return NextResponse.json({ error: '설정이 없습니다.' }, { status: 400 })
    }

    const config = JSON.parse(configStr)
    const fileMetadata = fileMetadataStr ? JSON.parse(fileMetadataStr) : []

    // 임시 디렉토리 생성
    const tmpDir = join(process.cwd(), 'tmp')
    try {
      await mkdir(tmpDir, { recursive: true })
    } catch (err) {
      // 이미 존재하면 무시
    }

    // 여러 파일 저장
    const filePaths: string[] = []
    const timestamp = Date.now()
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
      const filePath = join(tmpDir, `upload_${timestamp}_${i}.xlsx`)
    await writeFile(filePath, buffer)
      filePaths.push(filePath)
    }

    // Python 스크립트 실행
    const pythonScript = join(process.cwd(), 'python', 'analyze.py')
    const configPath = join(tmpDir, `config_${timestamp}.json`)
    
    // 각 파일에 대한 메타데이터를 config에 추가
    const configWithFiles = {
      ...config,
      files: filePaths.map((path, index) => ({
        path,
        country: fileMetadata[index]?.country || 'UK',
        reportOrder: fileMetadata[index]?.reportOrder || '1st report',
      })),
      debug: true,
    }
    
    console.log(`총 ${files.length}개 파일 업로드됨`)
    console.log(`파일 경로들:`, filePaths)
    console.log(`파일 메타데이터:`, fileMetadata)
    console.log(`설정 파일에 포함된 파일 정보:`, configWithFiles.files)
    
    await writeFile(configPath, JSON.stringify(configWithFiles, null, 2))

    try {
      // Python 실행 명령 (가상환경 우선, 없으면 기본 Python)
      const venvPython = join(process.cwd(), 'venv', 'bin', 'python')
      const fs = require('fs')
      let pythonCmd: string
      
      // 가상환경의 Python이 존재하면 사용 (Railway 배포 환경)
      if (fs.existsSync(venvPython)) {
        pythonCmd = venvPython
      } else {
        // 로컬 개발 환경 (Windows/Linux 호환)
        pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      }

      // Python 분석 실행 (환경 변수 포함)
      const env = {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      }
      
      // 여러 파일을 처리하도록 Python 스크립트에 전달
      // 첫 번째 파일 경로와 설정 파일 경로를 전달 (Python 스크립트에서 config에서 모든 파일 정보를 읽음)
      const { stdout, stderr } = await execAsync(
        `${pythonCmd} "${pythonScript}" "${filePaths[0]}" "${configPath}"`,
        { env }
      )

      // stdout에 디버그 정보가 있으면 로그 출력
      if (stdout) {
        console.log('Python stdout:', stdout)
      }

      if (stderr && !stderr.includes('DeprecationWarning')) {
        console.error('Python stderr:', stderr)
      }

      // 결과 JSON 읽기
      const resultsPath = join(tmpDir, 'results.json')
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
      
      // 결과가 비어있으면 경고
      const hasResults = 
        (results.primaryResults && results.primaryResults.length > 0) ||
        (results.secondaryResults && results.secondaryResults.length > 0) ||
        (results.additionalResults && results.additionalResults.length > 0)
      
      if (!hasResults) {
        console.warn('경고: 분석 결과가 비어있습니다.')
        // 에러는 아니지만 사용자에게 알림
        results.warning = '분석 결과가 없습니다. Excel 파일 형식과 KPI 설정을 확인해주세요.'
      }

      // Excel 리포트 생성
      const excelScript = join(process.cwd(), 'python', 'report_excel.py')
      const { stdout: excelStdout, stderr: excelStderr } = await execAsync(
        `${pythonCmd} "${excelScript}" "${resultsPath}"`
      )

      if (excelStderr && !excelStderr.includes('DeprecationWarning')) {
        console.error('Excel stderr:', excelStderr)
      }

      // Excel 파일 경로
      const excelPath = join(tmpDir, 'report.xlsx')
      const excelUrl = `/api/excel?t=${Date.now()}`
      
      // 파싱된 데이터 파일 경로
      const parsedDataPath = join(tmpDir, 'parsed_data.xlsx')
      const parsedDataUrl = `/api/parsed-data?t=${Date.now()}`

      // 임시 파일 정리 (업로드 파일과 설정 파일만)
      try {
        for (const filePath of filePaths) {
        await unlink(filePath)
        }
        await unlink(configPath)
      } catch (err) {
        console.error('임시 파일 삭제 실패:', err)
      }
            
            // 결과에 useAI 플래그 추가
            results.useAI = config.useAI || false
            
            return NextResponse.json({
              results,
              excelUrl,
              parsedDataUrl,
            })
    } catch (error: any) {
      // 임시 파일 정리
      try {
        for (const filePath of filePaths) {
        await unlink(filePath)
        }
        await unlink(configPath)
      } catch (err) {
        // 무시
      }

      console.error('Python 실행 오류:', error)
      return NextResponse.json(
        { error: `분석 실패: ${error.message}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

