import type { Metadata } from 'next'
import './globals.css'
import './contrast.css'
import './readability.css'
import './design-system.css'
import './receipt-palette.css'
import './ux-hardening.css'
import './final-ui.css'
import './ui-refresh.css'
import './ui-final.css'
import './adaptive-theme.css'
import './dashboard-theme.css'
import './green-buttons.css'
import './brand-theme.css'
import ClickAwayCloser from './dashboard/click-away-closer'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'BIZYBUK.IN · Business Management & POS',
  description: 'BIZYBUK.IN — fast, secure and smart business management, POS, inventory, purchases, accounts and customer ordering software.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-screen bg-slate-50 text-slate-950 antialiased"><ClickAwayCloser />{children}<Toaster position="top-right" toastOptions={{ duration: 3500 }} /></body></html>
}
