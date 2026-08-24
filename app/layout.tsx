import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'BIZBook · Business & POS Software',
  description: 'Professional shop management, POS, inventory, accounts and customer ordering software.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}<Toaster position="top-right" toastOptions={{ duration: 3500 }} /></body></html>
}
