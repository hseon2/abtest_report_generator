import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const pdfPath = join(process.cwd(), 'tmp', 'report.pdf')
    const pdfBuffer = await readFile(pdfPath)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="ab_test_report.pdf"',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'PDF 파일을 찾을 수 없습니다.' },
      { status: 404 }
    )
  }
}

