import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WASIMIL 補助金サポートポータル',
  description: '補助金申請サポートシステム by 株式会社AZOO',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
