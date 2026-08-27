'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, Edit3, ImagePlus, MapPin, Phone, Save, Settings2, Trash2, Upload, Users } from 'lucide-react'
import toast from 'react-hot-toast'

type Business = { id: string; name: string; code: string | null; phone: string | null; address: string | null; logo_url: string | null }
type Person = { id: string; full_name: string; phone: string | null; address: string; role: 'admin' | 'staff' | 'user'; is_active: boolean; party_id: string | null; created_at: string }

const roleLabel: Record<Person['role'], string> = { admin: 'Admin', staff: 'Staff', user: 'User / Customer' }

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState('')
  const logoInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [peopleLoading, setPeopleLoading] = useState(true)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)

  async function loadPeople() {
    setPeopleLoading(true)
    const response = await fetch('/api/settings/people', { cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) toast.error(data.error ?? 'Unable to load people.')
    else setPeople(data.people ?? [])
    setPeopleLoading(false)
  }

  useEffect(() => {
    fetch('/api/settings/business').then(async r => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Unable to load settings')
      setBusiness(data.business)
      setName(data.business.name || '')
      setCode(data.business.code || '')
      setPhone(data.business.phone || '')
      setAddress(data.business.address || '')
      setLogoPreview(data.business.logo_url || '')
    }).catch(e => setError(e instanceof Error ? e.message : 'Unable to load settings')).finally(() => setLoading(false))
    void loadPeople()
  }, [])

  async function save() {
    setSaving(true); setMessage(''); setError('')
    try {
      const r = await fetch('/api/settings/business', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code: code || null, phone: phone || null, address: address || null }) })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Unable to save settings')
      setBusiness(data.business); setLogoPreview(data.business.logo_url || ''); setMessage('Shop settings saved successfully.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save settings') } finally { setSaving(false) }
  }

  async function uploadLogo(file: File) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return toast.error('Use PNG, JPG or WebP.')
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be 2 MB or smaller.')
    setUploadingLogo(true)
    const localPreview = URL.createObjectURL(file)
    setLogoPreview(localPreview)
    try {
      const form = new FormData(); form.append('logo', file)
      const response = await fetch('/api/settings/business/logo', { method: 'POST', body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to upload logo.')
      setLogoPreview(data.logoUrl)
      setBusiness(current => current ? { ...current, logo_url: data.logoUrl } : current)
      toast.success('Logo uploaded and saved.')
    } catch (e) {
      setLogoPreview(business?.logo_url || '')
      toast.error(e instanceof Error ? e.message : 'Unable to upload logo.')
    } finally {
      URL.revokeObjectURL(localPreview)
      setUploadingLogo(false)
      if (logoInput.current) logoInput.current.value = ''
    }
  }

  async function removeLogo() {
    toast('To avoid affecting existing invoices, the current logo is kept until a replacement is uploaded.')
  }

  if (loading) return <div className="mx-auto max-w-5xl py-10"><div className="animate-pulse rounded-2xl bg-white p-8 shadow-sm"><div className="h-6 w-48 rounded bg-slate-200" /><div className="mt-6 h-12 rounded bg-slate-100" /><div className="mt-4 h-12 rounded bg-slate-100" /></div></div>

  return <div className="mx-auto max-w-5xl space-y-6">
    <div><div className="flex items-center gap-3"><div className="rounded-2xl bg-indigo-50 p-3 text-indigo-700"><Settings2 className="h-6 w-6" /></div><div><h1 className="text-2xl font-black tracking-tight">Shop Settings</h1><p className="text-sm text-slate-500">Manage your business identity, logo and the contact details used across BIZYBUK.</p></div></div></div>
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

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><ImagePlus className="h-5 w-5 text-indigo-600" /><div><h2 className="font-bold">Business logo</h2><p className="text-xs text-slate-500">Upload your own BIZYBUK / shop logo. It replaces the text logo in the business workspace.</p></div></div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">PNG · JPG · WebP · max 2 MB</span>
      </div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex h-28 w-full max-w-[320px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {logoPreview ? <img src={logoPreview} alt="Business logo preview" className="max-h-full max-w-full object-contain" /> : <div className="flex flex-col items-center gap-2 text-slate-400"><ImagePlus className="h-8 w-8" /><span className="text-xs font-semibold">No logo uploaded</span></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) void uploadLogo(file) }} />
          <button type="button" disabled={uploadingLogo} onClick={() => logoInput.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"><Upload className="h-4 w-4" />{uploadingLogo ? 'Uploading…' : logoPreview ? 'Replace logo' : 'Upload logo'}</button>
          {logoPreview && <button type="button" onClick={removeLogo} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Trash2 className="h-4 w-4" />Keep current</button>}
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-400">The uploaded image is stored with your business and can be shown consistently in the workspace, customer portal and future invoice/print branding.</p>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-7"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-indigo-600" /><div><h2 className="font-bold">People & customer accounts</h2><p className="text-xs text-slate-500">Change the name, phone and address of Admin, Staff, User and Customer accounts. Customer-linked profiles update their party record too.</p></div></div></div>
      {peopleLoading ? <div className="p-10 text-center text-sm text-slate-500">Loading people…</div> : <div className="divide-y divide-slate-100">
        {people.map(person => <div key={person.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900">{person.full_name}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${person.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : person.role === 'staff' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{roleLabel[person.role]}</span>{!person.is_active && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Inactive</span>}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>{person.phone || 'No phone'}</span>{person.address && <span>{person.address}</span>}</div></div><button type="button" onClick={() => setEditingPerson(person)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Edit3 className="h-4 w-4" /> Edit details</button></div>)}
        {people.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No people or customer accounts found.</div>}
      </div>}
    </section>

    {editingPerson && <PersonEditor person={editingPerson} onClose={() => setEditingPerson(null)} onSaved={() => { setEditingPerson(null); void loadPeople() }} />}
  </div>
}

function PersonEditor({ person, onClose, onSaved }: { person: Person; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState(person.full_name)
  const [phone, setPhone] = useState(person.phone ?? '')
  const [address, setAddress] = useState(person.address ?? '')
  const [saving, setSaving] = useState(false)
  const label = useMemo(() => roleLabel[person.role], [person.role])

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true)
    const response = await fetch('/api/settings/people', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: person.id, fullName, phone, address }) })
    const data = await response.json().catch(() => ({})); setSaving(false)
    if (!response.ok) return toast.error(data.error ?? 'Unable to update person.')
    toast.success('Person details updated.'); onSaved()
  }

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/40 p-4"><div className="mx-auto my-8 max-w-xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><h2 className="font-bold text-slate-900">Edit {label}</h2><p className="mt-1 text-xs text-slate-500">Changes update the account contact information.</p></div><button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button></div><form onSubmit={submit} className="space-y-5 p-5 sm:p-6"><label className="block text-sm font-semibold text-slate-700">Name<input value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={120} className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><label className="block text-sm font-semibold text-slate-700">Phone<input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+919876543210" className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /></label><label className="block text-sm font-semibold text-slate-700">Address<textarea value={address} onChange={e => setAddress(e.target.value)} rows={4} maxLength={500} className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Address" /></label><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={saving} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save details'}</button></div></form></div></div>
}
