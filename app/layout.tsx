import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Typing Analyzer - Tez yozish tekshiruvi',
  description: 'Tez yozish qobiliyatingizni o\'lchang va yaxshilang',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  )
}
