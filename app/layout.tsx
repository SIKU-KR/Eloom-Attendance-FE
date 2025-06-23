import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '이룸교회 청년부 출석부',
  description: '이룸교회 청년부 출석부',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
