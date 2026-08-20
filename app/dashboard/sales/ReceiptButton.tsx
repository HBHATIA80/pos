'use client'

import { Printer } from 'lucide-react'

type ReceiptButtonProps = { paymentId: string }

export default function ReceiptButton({ paymentId }: ReceiptButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.open(`/dashboard/sales/receipts/${paymentId}`, '_blank', 'noopener,noreferrer')}
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      <Printer className="h-4 w-4" />
      Print Receipt
    </button>
  )
}
