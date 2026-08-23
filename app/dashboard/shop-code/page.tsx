'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Loader2, MessageCircle, Share2, Store, Users } from 'lucide-react'
import toast from 'react-hot-toast'

type Shop = {
  id: string
  name: string
  code: string
}

export default function ShopCodePage() {
  const [shop, setShop] = useState<Shop | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadShopCode() {
      try {
        const response = await fetch('/api/admin/shop-code', { cache: 'no-store' })
        const body = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(body.error ?? 'Unable to load shop code')
        }

        if (mounted) setShop(body.shop)
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : 'Unable to load shop code')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void loadShopCode()
    return () => {
      mounted = false
    }
  }, [])

  const inviteMessage = useMemo(() => {
    if (!shop) return ''
    return `Join ${shop.name} on Partronix.in customer portal.\n\nShop Code: ${shop.code}\n\nUse this code when creating your customer account.`
  }, [shop])

  async function copyCode() {
    if (!shop) return
    await navigator.clipboard.writeText(shop.code)
    setCopied(true)
    toast.success('Shop code copied')
    window.setTimeout(() => setCopied(false), 1800)
  }

  async function copyInvite() {
    if (!inviteMessage) return
    await navigator.clipboard.writeText(inviteMessage)
    toast.success('Customer invitation copied')
  }

  async function shareInvite() {
    if (!shop) return

    if (navigator.share) {
      await navigator.share({
        title: `Join ${shop.name}`,
        text: inviteMessage,
      }).catch(() => undefined)
      return
    }

    await copyInvite()
  }

  function shareWhatsApp() {
    if (!inviteMessage) return
    const url = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Store className="h-3.5 w-3.5" /> Customer Portal
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Shop Code</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Give this code to customers so they can join your shop. A customer can use the same account with multiple shops.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Users className="h-6 w-6" />
          </div>
        </div>
      </section>

      {loading ? (
        <section className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </section>
      ) : shop ? (
        <>
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Your shop</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">{shop.name}</h2>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Customer Shop Code</p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <code className="break-all text-2xl font-bold tracking-wide text-slate-950 sm:text-3xl">{shop.code}</code>
                <button
                  type="button"
                  onClick={() => void copyCode()}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Customers enter this exact code on the Customer Signup page.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Share with customers</h2>
              <p className="mt-1 text-sm text-slate-500">Send the code directly or copy the ready-to-send invitation.</p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={shareWhatsApp} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </button>
              <button type="button" onClick={() => void shareInvite()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Share2 className="h-4 w-4" /> Share
              </button>
              <button type="button" onClick={() => void copyInvite()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Copy className="h-4 w-4" /> Copy Invitation
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 whitespace-pre-line">
              {inviteMessage}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-lg font-bold text-slate-950">How customers join</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">1</span> Open Customer Signup.</li>
              <li><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">2</span> Enter their name, mobile number and password.</li>
              <li><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">3</span> Enter <strong>{shop.code}</strong> as the Shop Code.</li>
              <li><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">4</span> After joining, the customer can access this shop's portal data without becoming an admin.</li>
            </ol>
          </section>
        </>
      ) : null}
    </div>
  )
}
