import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { spawn } from 'child_process'
import * as fs from 'fs'

const PROGRESS_LINE = /\[PROGRESS\](\d+)(?:\|(.*))?/

function pushProgress(controller: ReadableStreamDefaultController<Uint8Array>, percent: number, message: string) {
  const encoder = new TextEncoder()
  controller.enqueue(encoder.encode(JSON.stringify({ type: 'progress', percent, message }) + '\n'))
}

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

    // 디버깅: 받은 config 확인
    console.log('=== API Route: 받은 Config ===')
    console.log('config.kpis:', JSON.stringify(config.kpis, null, 2))
    console.log('config.kpis 개수:', config.kpis ? config.kpis.length : 0)
    console.log('config.variationCount:', config.variationCount)
    console.log('config.segments:', config.segments)
    console.log('config.useAI:', config.useAI)

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
      // 원본 파일 확장자 유지
      const originalName = file.name
      const fileExt = originalName.substring(originalName.lastIndexOf('.')) || '.xlsx'
      const filePath = join(tmpDir, `upload_${timestamp}_${i}${fileExt}`)
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
        startDate: fileMetadata[index]?.startDate || null,
        endDate: fileMetadata[index]?.endDate || null,
      })),
      debug: true,
    }
    
    console.log(`총 ${files.length}개 파일 업로드됨`)
    console.log(`파일 경로들:`, filePaths)
    console.log(`파일 메타데이터:`, fileMetadata)
    console.log(`설정 파일에 포함된 파일 정보:`, configWithFiles.files)
    
    // 디버깅: Python으로 전달되는 config 확인
    console.log('=== Python으로 전달될 Config ===')
    console.log('configWithFiles.kpis:', JSON.stringify(configWithFiles.kpis, null, 2))
    console.log('configWithFiles.kpis 개수:', configWithFiles.kpis ? configWithFiles.kpis.length : 0)
    
    await writeFile(configPath, JSON.stringify(configWithFiles, null, 2))
    
    // 디버깅: 실제로 저장된 config 파일 읽어서 확인
    const savedConfig = JSON.parse(await require('fs/promises').readFile(configPath, 'utf-8'))
    console.log('=== 저장된 Config 파일 내용 ===')
    console.log('savedConfig.kpis:', JSON.stringify(savedConfig.kpis, null, 2))
    console.log('savedConfig.kpis 개수:', savedConfig.kpis ? savedConfig.kpis.length : 0)

    const venvPython = join(process.cwd(), 'venv', 'bin', 'python')
    let pythonCmd: string
    if (fs.existsSync(venvPython)) {
      pythonCmd = venvPython
    } else {
      pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    }
    const env = {
      ...process.env,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
    }
    const resultsPath = join(tmpDir, 'results.json')
    const excelScript = join(process.cwd(), 'python', 'report_excel.py')
    const excelPath = join(tmpDir, 'report.xlsx')
    const parsedDataPath = join(tmpDir, 'parsed_data.xlsx')

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder()
        try {
          await new Promise<void>((resolve, reject) => {
            const child = spawn(pythonCmd, [pythonScript, filePaths[0], configPath], { env })
            let buffer = ''
            child.stdout?.on('data', (chunk: Buffer) => {
              buffer += chunk.toString()
              const parts = buffer.split('\n')
              buffer = parts.pop() ?? ''
              for (const line of parts) {
                const m = line.match(PROGRESS_LINE)
                if (m) pushProgress(controller, parseInt(m[1], 10), (m[2] || '').trim())
              }
            })
            child.stderr?.on('data', (chunk: Buffer) => {
              const s = chunk.toString()
              if (!s.includes('DeprecationWarning')) console.error('Python stderr:', s)
            })
            child.on('error', reject)
            child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`analyze.py exited with ${code}`))))
          })

          let results: any = null
          for (let i = 0; i < 50; i++) {
            try {
              if (fs.existsSync(resultsPath)) {
                const content = fs.readFileSync(resultsPath, 'utf-8')
                if (content?.trim()) {
                  results = JSON.parse(content)
                  if (results?.primaryResults?.length) break
                }
              }
            } catch (_) {}
            await new Promise((r) => setTimeout(r, 100))
          }
          if (!results) results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'))
          const hasResults =
            (results.primaryResults?.length > 0) ||
            (results.secondaryResults?.length > 0) ||
            (results.additionalResults?.length > 0)
          if (!hasResults) results.warning = '분석 결과가 없습니다. Excel 파일 형식과 KPI 설정을 확인해주세요.'

          await new Promise<void>((resolve, reject) => {
            const child = spawn(pythonCmd, [excelScript, resultsPath], { env })
            let buffer = ''
            child.stdout?.on('data', (chunk: Buffer) => {
              buffer += chunk.toString()
              const parts = buffer.split('\n')
              buffer = parts.pop() ?? ''
              for (const line of parts) {
                const m = line.match(PROGRESS_LINE)
                if (m) pushProgress(controller, parseInt(m[1], 10), (m[2] || '').trim())
              }
            })
            child.stderr?.on('data', (chunk: Buffer) => {
              const s = chunk.toString()
              if (!s.includes('DeprecationWarning')) console.error('Excel stderr:', s)
            })
            child.on('error', reject)
            child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`report_excel.py exited with ${code}`))))
          })

          let excelBase64: string | null = null
          let parsedDataBase64: string | null = null
          if (fs.existsSync(excelPath)) {
            excelBase64 = fs.readFileSync(excelPath).toString('base64')
          }
          if (fs.existsSync(parsedDataPath)) {
            parsedDataBase64 = fs.readFileSync(parsedDataPath).toString('base64')
          }
          results.useAI = config.useAI || false
          const excelUrl = excelBase64 ? null : `/api/excel?t=${Date.now()}`
          const parsedDataUrl = parsedDataBase64 ? null : `/api/parsed-data?t=${Date.now()}`
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'done',
            data: { results, excelUrl, parsedDataUrl, excelBase64, parsedDataBase64 },
          }) + '\n'))

          try {
            for (const p of filePaths) await unlink(p)
            await unlink(configPath)
          } catch (_) {}
        } catch (error: any) {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', error: error?.message || '분석 실패' }) + '\n'))
          try {
            for (const p of filePaths) await unlink(p)
            await unlink(configPath)
          } catch (_) {}
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson' },
    })
  } catch (error: any) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

