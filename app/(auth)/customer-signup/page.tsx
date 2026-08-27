'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Smartphone, Store, User, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

export default function CustomerSignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [shopCode, setShopCode] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault()
    if (loading) return
    const cleanName = fullName.trim(), cleanCode = shopCode.trim().toUpperCase(), cleanPhone = phone.trim()
    if (cleanName.length < 2) return toast.error('Please enter your full name')
    if (!cleanCode) return toast.error('Please enter the shop code')
    if (!cleanPhone) return toast.error('Please enter your mobile number')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    if (password !== confirmPassword) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ phone: cleanPhone, password, options: { data: { account_type: 'customer', business_code: cleanCode, full_name: cleanName } } })
      if (error) { toast.error(error.message); return }
      if (!data.user) { toast.error('Unable to create customer account'); return }
      if (!data.session) { toast.success('Customer account created. Please sign in.'); router.push('/login'); return }
      toast.success('Customer account created'); router.replace('/dashboard/orders'); router.refresh()
    } catch (error) { console.error(error); toast.error('Unable to create customer account') }
    finally { setLoading(false) }
  }

  const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'
  const Field = ({ label, id, children }: { label: string; id: string; children: React.ReactNode }) => <div><label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-800">{label}</label>{children}</div>

  return (
    <main className="min-h-screen bg-[#f5f8fc] text-slate-950 lg:grid lg:grid-cols-[.95fr_1.05fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#06101f] text-white lg:flex lg:flex-col">
        <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" /><div className="absolute -right-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative flex flex-1 flex-col px-10 py-8 xl:px-16">
          <Link href="/" className="brand-lockup w-fit"><span className="brand-mark">B</span><span className="brand-wordmark text-white">BIZYBUK<span>.IN</span></span></Link>
          <div className="my-auto max-w-xl pb-10"><div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-blue-200"><Zap className="h-3.5 w-3.5" /> Fast · Secure · Smart</div><h1 className="mt-7 text-5xl font-black italic leading-[1.02] tracking-[-.055em] xl:text-6xl">Your shop,<br /><span className="text-blue-400">closer to you.</span></h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-300">Join your shop's BIZYBUK.IN customer portal to browse products, place orders and keep track of your account.</p><div className="mt-9 space-y-3">{['Shop from your connected business', 'Keep orders and account details together', 'Use the portal easily on any device'].map(item => <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-200"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-blue-300"><Check className="h-3.5 w-3.5" /></span>{item}</div>)}</div></div><p className="text-xs font-semibold text-slate-500">Business. Simplified. Success Amplified.</p>
        </div>
      </section>
      <section className="flex min-h-screen flex-col">
        <header className="flex h-20 items-center justify-between px-5 sm:px-8 lg:px-12"><Link href="/" className="brand-lockup lg:hidden"><span className="brand-mark">B</span><span className="brand-wordmark">BIZYBUK<span>.IN</span></span></Link><div className="ml-auto text-sm font-semibold text-slate-500">Already have an account? <Link href="/login" className="font-black text-blue-600">Sign in</Link></div></header>
        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-8 lg:px-12 lg:pb-16"><div className="w-full max-w-xl">
          <div className="mb-8 max-w-lg"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Store className="h-6 w-6" /></div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Customer portal</p><h2 className="mt-2 text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">Create your customer account</h2><p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">Join an existing shop and access your customer portal with BIZYBUK.IN.</p></div>
          <form onSubmit={handleSignup} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2"><Field label="Your name" id="customer-name"><div className="relative"><User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="customer-name" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your name" className={`${inputClass} pl-11 pr-3`} /></div></Field><Field label="Shop code" id="shop-code"><div className="relative"><Store className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="shop-code" required value={shopCode} onChange={e => setShopCode(e.target.value.toUpperCase())} placeholder="SHOP-XXXXXXXX" className={`${inputClass} pl-11 pr-3 uppercase`} /></div><p className="mt-2 text-xs text-slate-400">Use the code provided by the shop.</p></Field></div>
            <div className="mt-5"><Field label="Mobile number" id="customer-phone"><div className="relative"><Smartphone className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="customer-phone" type="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={`${inputClass} pl-11 pr-3`} /></div></Field></div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Password" id="customer-password"><div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="customer-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" className={`${inputClass} pl-11 pr-11`} /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field><Field label="Confirm password" id="customer-confirm"><div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="customer-confirm" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className={`${inputClass} pl-11 pr-11`} /><button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field></div>
            <button type="submit" disabled={loading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating your account...</> : <>Create customer account <ArrowRight className="h-4 w-4" /></>}</button><p className="mt-4 text-center text-xs leading-5 text-slate-400">Your customer account is linked to the shop code you provide.</p>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">Opening a shop instead? <Link href="/signup" className="font-black text-blue-600">Create a Shop Account</Link></p>
        </div></div>
      </section>
    </main>
  )
}
