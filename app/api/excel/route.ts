import { NextRequest, NextResponse } from 'next/server'
import { readFile, access, writeFile, unlink } from 'fs/promises'
import { constants } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'

function execFileAsync(command: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stderr || ''}`))
        return
      }
      if (stdout) console.log(stdout)
      resolve()
    })
  })
}

export async function GET(request: NextRequest) {
  try {
    const excelPath = join(process.cwd(), 'tmp', 'report.xlsx')
    
    // 파일 존재 여부 확인
    try {
      await access(excelPath, constants.F_OK)
    } catch (err) {
      console.error(`Excel file not found at: ${excelPath}`)
      console.error(`Current working directory: ${process.cwd()}`)
      return NextResponse.json(
        { 
          error: 'Excel 파일을 찾을 수 없습니다.',
          debug: {
            path: excelPath,
            cwd: process.cwd()
          }
        },
        { status: 404 }
      )
    }
    
    const excelBuffer = await readFile(excelPath)
    console.log(`Excel file read successfully: ${excelPath}, size: ${excelBuffer.length} bytes`)

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ab_test_report.xlsx"',
      },
    })
  } catch (error: any) {
    console.error('Error reading Excel file:', error)
    return NextResponse.json(
      { 
        error: 'Excel 파일을 읽는 중 오류가 발생했습니다.',
        details: error.message
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const excelPath = join(process.cwd(), 'tmp', 'report.xlsx')

    try {
      await access(excelPath, constants.F_OK)
    } catch (err) {
      return NextResponse.json(
        { error: 'Excel 파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const testTitle = typeof body.testTitle === 'string' ? body.testTitle : ''
    const abTestSummary = typeof body.abTestSummary === 'string' ? body.abTestSummary : ''
    const abTestResults = typeof body.abTestResults === 'string' ? body.abTestResults : ''

    if (testTitle || abTestSummary || abTestResults) {
      const payloadPath = join(process.cwd(), 'tmp', `summary_payload_${Date.now()}.json`)
      try {
        await writeFile(
          payloadPath,
          JSON.stringify({ testTitle, abTestSummary, abTestResults }, null, 2),
          'utf-8'
        )
        await execFileAsync(
          'python',
          [join(process.cwd(), 'python', 'add_summary_sheet.py'), excelPath, payloadPath],
          process.cwd()
        )
      } finally {
        await unlink(payloadPath).catch(() => undefined)
      }
    }

    const excelBuffer = await readFile(excelPath)
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ab_test_report.xlsx"',
      },
    })
  } catch (error: any) {
    console.error('Error creating summary excel file:', error)
    return NextResponse.json(
      {
        error: 'Summary 시트 생성 중 오류가 발생했습니다.',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

