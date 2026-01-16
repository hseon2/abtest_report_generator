import { NextRequest, NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import { constants } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const parsedDataPath = join(process.cwd(), 'tmp', 'parsed_data.xlsx')
    
    // 파일 존재 여부 확인
    try {
      await access(parsedDataPath, constants.F_OK)
    } catch (err) {
      console.error(`Parsed data file not found at: ${parsedDataPath}`)
      console.error(`Current working directory: ${process.cwd()}`)
      return NextResponse.json(
        { 
          error: '파싱된 데이터 파일을 찾을 수 없습니다.',
          debug: {
            path: parsedDataPath,
            cwd: process.cwd()
          }
        },
        { status: 404 }
      )
    }
    
    const excelBuffer = await readFile(parsedDataPath)
    console.log(`Parsed data file read successfully: ${parsedDataPath}, size: ${excelBuffer.length} bytes`)

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="parsed_data.xlsx"',
      },
    })
  } catch (error: any) {
    console.error('Error reading parsed data file:', error)
    return NextResponse.json(
      { 
        error: '파싱된 데이터 파일을 읽는 중 오류가 발생했습니다.',
        details: error.message
      },
      { status: 500 }
    )
  }
}

