import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const parsedDataPath = join(process.cwd(), 'tmp', 'parsed_data.xlsx')
    const excelBuffer = await readFile(parsedDataPath)

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="parsed_data.xlsx"',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: '파싱된 데이터 파일을 찾을 수 없습니다.' },
      { status: 404 }
    )
  }
}

