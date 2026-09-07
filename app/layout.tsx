import type { Metadata } from 'next'
import './globals.css'
import './mobile-ui-polish.css'
import './receipt-palette.css'
import './homepage-why-card.css'
import './import-page-theme.css'
import './bulk-entry-sizing.css'
import './super-admin/super-admin-theme.css'
import './dashboard/voucher-dialog.css'
import './dashboard/invoice-viewer.css'
import './dashboard/sales/sales-workspace.css'
import './dashboard/walk-in-details.css'
import ClickAwayCloser from './dashboard/click-away-closer'
import WalkInDetailsBridge from './dashboard/walk-in-details-bridge'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'BIZYBUK.IN · Business Management & POS',
  description: 'BIZYBUK.IN — fast, secure and smart business management, POS, inventory, purchases, accounts and customer ordering software.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <ClickAwayCloser />
        <WalkInDetailsBridge />
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      </body>
    </html>
  )
}