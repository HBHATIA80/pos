'use client'

import { useEffect, useState } from 'react'
import {
  Banknote,
  Check,
  CreditCard,
  Loader2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'

type PaymentMethod =
  | 'cash'
  | 'bank'

type PaymentSummary = {
  invoice_id: string
  grand_total: number
  paid_amount: number
  balance_amount: number
  payment_status:
    | 'unpaid'
    | 'partial'
    | 'paid'
}

type PaymentDialogProps = {
  invoiceId: string | null
  open: boolean
  onClose: () => void
  onPaymentSaved?: () => void
}

export default function PaymentDialog({
  invoiceId,
  open,
  onClose,
  onPaymentSaved,
}: PaymentDialogProps) {
  const [summary, setSummary] =
    useState<PaymentSummary | null>(null)

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('cash')

  const [amount, setAmount] =
    useState('')

  const [referenceNo, setReferenceNo] =
    useState('')

  const [notes, setNotes] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [saving, setSaving] =
    useState(false)

  async function loadSummary() {
    if (!invoiceId) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/sales/${invoiceId}/payment`,
        {
          cache: 'no-store',
        }
      )

      const result =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.error ??
            'Unable to load payment information'
        )
      }

      const nextSummary =
        result.summary ?? null

      setSummary(nextSummary)

      if (nextSummary) {
        setAmount(
          Number(
            nextSummary.balance_amount
          ).toFixed(2)
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to load payment information'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && invoiceId) {
      setPaymentMethod('cash')
      setReferenceNo('')
      setNotes('')
      setAmount('')
      void loadSummary()
    }

    if (!open) {
      setSummary(null)
      setAmount('')
    }
  }, [open, invoiceId])

  if (!open || !invoiceId) {
    return null
  }

  const total = Number(
    summary?.grand_total ?? 0
  )

  const paid = Number(
    summary?.paid_amount ?? 0
  )

  const balance = Number(
    summary?.balance_amount ?? 0
  )

  async function savePayment() {
    const numericAmount =
      Number(amount)

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      toast.error(
        'Enter a valid payment amount'
      )
      return
    }

    if (numericAmount > balance) {
      toast.error(
        `Payment cannot exceed balance of ₹${balance.toFixed(
          2
        )}`
      )
      return
    }

    setSaving(true)

    try {
      const response = await fetch(
        `/api/sales/${invoiceId}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            payment_method:
              paymentMethod,
            amount: numericAmount,
            reference_no:
              referenceNo,
            notes,
          }),
        }
      )

      const result =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.error ??
            'Unable to save payment'
        )
      }

      toast.success(
        'Payment saved successfully'
      )

      onPaymentSaved?.()

      if (result.summary) {
        setSummary(result.summary)

        const nextBalance =
          Number(
            result.summary
              .balance_amount
          )

        if (nextBalance > 0) {
          setAmount(
            nextBalance.toFixed(2)
          )
        } else {
          setAmount('0.00')
        }

        if (
          result.summary
            .payment_status ===
          'paid'
        ) {
          setTimeout(() => {
            onClose()
          }, 500)
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to save payment'
      )
    } finally {
      setSaving(false)
    }
  }

  function payFullBalance() {
    setAmount(
      balance.toFixed(2)
    )
  }

  function payLater() {
    toast.success(
      'Invoice saved as credit / unpaid'
    )

    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Receive Payment
            </h2>

            <p className="text-xs text-slate-500">
              Record money received
              against this invoice
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* SUMMARY */}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Invoice
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-900">
                    ₹{total.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                    Paid
                  </p>

                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    ₹{paid.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Balance
                  </p>

                  <p className="mt-1 text-sm font-bold text-amber-700">
                    ₹{balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* PAID */}

              {summary?.payment_status ===
              'paid' ? (
                <div className="rounded-2xl bg-emerald-50 p-6 text-center">
                  <Check className="mx-auto h-9 w-9 text-emerald-600" />

                  <p className="mt-3 font-bold text-emerald-800">
                    Invoice Fully Paid
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    There is no outstanding
                    balance.
                  </p>
                </div>
              ) : (
                <>
                  {/* METHOD */}

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Payment Method
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            'cash'
                          )
                        }
                        className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${
                          paymentMethod ===
                          'cash'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Banknote className="h-5 w-5" />

                        Cash
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPaymentMethod(
                            'bank'
                          )
                        }
                        className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold ${
                          paymentMethod ===
                          'bank'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />

                        Bank
                      </button>
                    </div>
                  </div>

                  {/* AMOUNT */}

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label
                        htmlFor="payment-amount"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Amount Received
                      </label>

                      <button
                        type="button"
                        onClick={
                          payFullBalance
                        }
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Pay full balance
                      </button>
                    </div>

                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-400">
                        ₹
                      </span>

                      <input
                        id="payment-amount"
                        name="payment-amount"
                        type="number"
                        min="0"
                        max={balance}
                        step="0.01"
                        value={amount}
                        onChange={(event) =>
                          setAmount(
                            event.target
                              .value
                          )
                        }
                        className="min-h-14 w-full rounded-2xl border border-slate-200 pl-10 pr-4 text-xl font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* BANK REFERENCE */}

                  {paymentMethod ===
                    'bank' && (
                    <div>
                      <label
                        htmlFor="payment-reference"
                        className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        Reference No.
                      </label>

                      <input
                        id="payment-reference"
                        name="payment-reference"
                        value={
                          referenceNo
                        }
                        onChange={(event) =>
                          setReferenceNo(
                            event.target
                              .value
                          )
                        }
                        placeholder="Transaction / reference number"
                        className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  )}

                  {/* NOTES */}

                  <div>
                    <label
                      htmlFor="payment-notes"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                    >
                      Notes
                    </label>

                    <input
                      id="payment-notes"
                      name="payment-notes"
                      value={notes}
                      onChange={(event) =>
                        setNotes(
                          event.target.value
                        )
                      }
                      placeholder="Optional payment note"
                      className="min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* PAYMENT PREVIEW */}

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        Paid now
                      </span>

                      <span className="font-semibold text-slate-900">
                        ₹
                        {Number(
                          amount || 0
                        ).toFixed(2)}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between">
                      <span className="font-semibold text-slate-700">
                        Balance after payment
                      </span>

                      <span className="font-bold text-blue-700">
                        ₹
                        {Math.max(
                          balance -
                            Number(
                              amount ||
                                0
                            ),
                          0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS */}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={
                        payLater
                      }
                      disabled={saving}
                      className="min-h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      Pay Later / Credit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void savePayment()
                      }
                      disabled={
                        saving ||
                        loading ||
                        balance <= 0
                      }
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />

                          Saving…
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />

                          Save Payment
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}