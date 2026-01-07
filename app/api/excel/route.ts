import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const excelPath = join(process.cwd(), 'tmp', 'report.xlsx')
    const excelBuffer = await readFile(excelPath)

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ab_test_report.xlsx"',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Excel 파일을 찾을 수 없습니다.' },
      { status: 404 }
    )
  }
}

