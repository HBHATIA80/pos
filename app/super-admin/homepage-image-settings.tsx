'use client'

import { ChangeEvent, useEffect, useState } from 'react'
import { CheckCircle2, ImageIcon, RefreshCw, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const ASSET_URL = '/api/landing-assets/shop-owner'
const MAX_BYTES = 8 * 1024 * 1024

export default function HomepageImageSettings() {
  const [selected, setSelected] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>(ASSET_URL)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!selected) return
    const url = URL.createObjectURL(selected)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [selected])

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Please choose a PNG, JPEG or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be 8 MB or smaller.')
      return
    }
    setSelected(file)
  }

  async function upload() {
    if (!selected || uploading) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('image', selected)
      const response = await fetch('/api/super-admin', {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to update homepage image.')
      setSelected(null)
      setPreview(`${ASSET_URL}?v=${Date.now()}`)
      toast.success(body.message || 'Homepage image updated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update homepage image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Homepage image</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Change the shop-owner image shown on the public BIZYBUK.IN homepage without editing the code.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <label className="group flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
            <Upload className="h-8 w-8 text-blue-600" />
            <span className="mt-3 text-sm font-extrabold text-slate-900">Choose a new homepage image</span>
            <span className="mt-1 text-xs text-slate-500">PNG, JPEG or WebP · maximum 8 MB</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} className="sr-only" />
          </label>

          {selected && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">{selected.name}</p>
                <p className="text-xs text-slate-500">{(selected.size / 1024 / 1024).toFixed(2)} MB · ready to publish</p>
              </div>
              <button type="button" onClick={() => void upload()} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {uploading ? 'Publishing…' : 'Publish image'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">Live preview</p>
              <p className="mt-0.5 text-xs font-bold text-slate-700">Homepage shop owner</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-600">LIVE</span>
          </div>
          <div className="flex min-h-[300px] items-end justify-center overflow-hidden rounded-xl bg-gradient-to-br from-white to-blue-50 p-2">
            <img src={preview} alt="Homepage shop owner preview" className="h-[300px] w-full object-contain" />
          </div>
        </div>
      </div>
    </section>
  )
}
