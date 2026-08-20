import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Partronix.in POS',
  description: 'Mobile and desktop ready POS system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
          }}
        />
      </body>
    </html>
  )
}