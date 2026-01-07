import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'A/B Test Report Generator',
  description: 'Adobe Analytics A/B 테스트 리포트 자동 생성 도구',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" style={{ margin: 0, padding: 0, width: '100%', overflowX: 'hidden' }}>
      <body style={{ margin: 0, padding: 0, width: '100%' }}>{children}</body>
    </html>
  )
}

