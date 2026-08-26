'use client'

import { useEffect, useState } from 'react'
import { Building2, MapPin, Phone, Save, Settings2 } from 'lucide-react'

type Business = { id: string; name: string; code: string | null; phone: string | null; address: string | null }

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings/business').then(async r => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Unable to load settings')
      setBusiness(data.business)
      setName(data.business.name || '')
      setCode(data.business.code || '')
      setPhone(data.business.phone || '')
      setAddress(data.business.address || '')
    }).catch(e => setError(e instanceof Error ? e.message : 'Unable to load settings')).finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setMessage(''); setError('')
    try {
      const r = await fetch('/api/settings/business', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code: code || null, phone: phone || null, address: address || null }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Unable to save settings')
      setBusiness(data.business); setMessage('Shop settings saved successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save settings') } finally { setSaving(false) }
  }

  if (loading) return <div className="mx-auto max-w-4xl py-10"><div className="animate-pulse rounded-2xl bg-white p-8 shadow-sm"><div className="h-6 w-48 rounded bg-slate-200" /><div className="mt-6 h-12 rounded bg-slate-100" /><div className="mt-4 h-12 rounded bg-slate-100" /></div></div>

  return <div className="mx-auto max-w-4xl space-y-6">
    <div><div className="flex items-center gap-3"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700"><Settings2 className="h-6 w-6" /></div><div><h1 className="text-2xl font-black tracking-tight">Shop Settings</h1><p className="text-sm text-slate-500">Manage the business information shown across BIZBook.</p></div></div></div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
    {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex items-center gap-3"><Building2 className="h-5 w-5 text-indigo-600" /><div><h2 className="font-bold">Business identity</h2><p className="text-xs text-slate-500">These details are shared by your business portal and invoices.</p></div></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Shop / Business Name</span><input value={name} onChange={e => setName(e.target.value)} maxLength={120} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="My Shop" /></label>
        <label><span className="mb-1.5 block text-sm font-semibold">Shop Code</span><input value={code} onChange={e => setCode(e.target.value)} maxLength={40} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Optional shop code" /></label>
        <label><span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"><Phone className="h-4 w-4" /> Phone</span><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Business phone" /></label>
        <label className="sm:col-span-2"><span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold"><MapPin className="h-4 w-4" /> Address</span><textarea value={address} onChange={e => setAddress(e.target.value)} rows={4} className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Shop address" /></label>
      </div>
      <div className="mt-7 flex justify-end"><button disabled={saving || !name.trim()} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}</button></div>
    </section>
    <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5"><h2 className="font-bold">Branding</h2><p className="mt-1 text-sm text-slate-500">Logo upload is reserved for the next branding update so it can be stored securely and reflected consistently on invoices and the customer portal.</p></section>
  </div>
}
