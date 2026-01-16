import { NextRequest, NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import { constants } from 'fs'
import { join } from 'path'

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

