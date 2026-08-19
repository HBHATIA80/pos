import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'POS System',
  description: 'Mobile-ready and desktop-ready point of sale system',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
