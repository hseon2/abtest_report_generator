import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }

    // 임시 디렉토리 생성
    const tmpDir = join(process.cwd(), 'tmp')
    try {
      await mkdir(tmpDir, { recursive: true })
    } catch (err) {
      // 이미 존재하면 무시
    }

    // 파일 저장
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = join(tmpDir, `detect_country_${Date.now()}.xlsx`)
    await writeFile(filePath, buffer)

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
      
      const pythonScript = join(process.cwd(), 'python', 'detect_country_ai.py')

      // 환경 변수 설정
      const env = {
        ...process.env,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
      }

      const { stdout, stderr } = await execAsync(
        `${pythonCmd} "${pythonScript}" "${filePath}"`,
        { env }
      )

      // 임시 파일 삭제
      try {
        await unlink(filePath)
      } catch (err) {
        console.error('임시 파일 삭제 실패:', err)
      }

      if (stderr && !stderr.includes('DeprecationWarning')) {
        console.error('Python stderr:', stderr)
      }

      // stdout에서 국가 코드 추출 (JSON 형식으로 반환한다고 가정)
      const detectedCountry = stdout.trim()
      
      // 유효한 국가 코드인지 확인
      const validCountries = ['AE', 'AE_AR', 'AFRICA_EN', 'AFRICA_FR', 'AFRICA_PT', 'AL', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BD', 'BE', 'BE_FR', 'BG', 'BR', 'CA', 'CA_FR', 'CH', 'CH_FR', 'CL', 'CN', 'CO', 'CZ', 'DE', 'DK', 'EE', 'EG', 'ES', 'FI', 'FR', 'GE', 'GR', 'HK', 'HK_EN', 'HR', 'HU', 'ID', 'IE', 'IL', 'IN', 'IQ_AR', 'IQ_KU', 'IRAN', 'IT', 'JP', 'KB', 'KZ_KZ', 'KZ_RU', 'LATIN', 'LATIN_EN', 'LEVANT', 'LEVANT_AR', 'LT', 'LV', 'MK', 'MM', 'MN', 'MX', 'MY', 'N_AFRICA', 'NL', 'NO', 'NZ', 'PE', 'PH', 'PK', 'PL', 'PS', 'PT', 'PY', 'RO', 'RS', 'SA', 'SA_EN', 'SE', 'SEC', 'SG', 'SI', 'SK', 'TH', 'TR', 'TW', 'UA', 'UK', 'US', 'UY', 'UZ_RU', 'UZ_UZ', 'VN', 'ZA']
      
      if (detectedCountry && validCountries.includes(detectedCountry)) {
        return NextResponse.json({ country: detectedCountry })
      } else {
        // AI 감지 실패 시 기본값 반환
        return NextResponse.json({ country: 'UK' })
      }
    } catch (error: any) {
      // 임시 파일 삭제
      try {
        await unlink(filePath)
      } catch (err) {
        // 무시
      }

      console.error('국가 감지 오류:', error)
      return NextResponse.json({ country: 'UK' }) // 기본값 반환
    }
  } catch (error: any) {
    console.error('API 오류:', error)
    return NextResponse.json(
      { error: error.message || '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

