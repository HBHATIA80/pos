'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Check, Eye, EyeOff, Loader2, Lock, MessageCircle, Smartphone, X, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

const supportUrl = 'https://wa.me/919996609399?text=I%20have%20a%20question%20about%20BIZYBUK.IN'
const concurrentLoginMessage = 'This login credential is already in use on another device. Please log out there before signing in here.'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showTakeover, setShowTakeover] = useState(false)
  const [takeoverLoading, setTakeoverLoading] = useState(false)

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading || takeoverLoading) return
    const cleanPhone = phone.trim()
    if (!cleanPhone) return toast.error('Please enter your mobile number')
    if (!password) return toast.error('Please enter your password')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ phone: cleanPhone, password })
      if (error) { toast.error(error.message); return }

      const sessionResponse = await fetch('/api/auth/session', { method: 'POST', credentials: 'include', cache: 'no-store' })
      const sessionBody = await sessionResponse.json().catch(() => ({}))
      if (!sessionResponse.ok) {
        if (sessionResponse.status === 409) {
          setShowTakeover(true)
        } else {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
          toast.error(sessionBody.error || 'Unable to establish a secure login session.')
        }
        return
      }

      toast.success('You are signed in')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error(error)
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
      toast.error('Unable to sign in securely. Please try again.')
    } finally { setLoading(false) }
  }

  const takeover = async () => {
    if (takeoverLoading) return
    setTakeoverLoading(true)
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(body.error || 'The other device could not be signed out. Please try again.')
        return
      }
      setShowTakeover(false)
      toast.success('Other device signed out. You can continue here.')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('Unable to switch devices right now. Please try again.')
    } finally { setTakeoverLoading(false) }
  }

  const inputClass = 'h-12 w-full rounded-xl border border-slate-300 bg-white text-sm text-black outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'

  return (
    <main className="min-h-screen bg-[#f5f8fc] text-black lg:grid lg:grid-cols-[.95fr_1.05fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-white text-black lg:flex lg:flex-col">
        <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-blue-100 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-blue-50 blur-3xl" />
        <div className="relative flex flex-1 flex-col px-10 py-8 xl:px-16">
          <Link href="/" className="brand-lockup w-fit"><span className="brand-mark">B</span><span className="brand-wordmark">BIZYBUK<span>.IN</span></span></Link>
          <div className="my-auto max-w-xl pb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black"><Zap className="h-3.5 w-3.5 text-blue-600" /> Fast · Secure · Smart</div>
            <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-.055em] text-black xl:text-6xl">Run your business,<br /><span className="text-blue-600">with clarity.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-black">Sales, inventory, customers, payments and everyday work — all in one clear BIZYBUK.IN workspace.</p>
            <div className="mt-9 space-y-3">{['One workspace for your daily business', 'Fast access to sales, stock and accounts', 'Secure access wherever you work'].map(item => <div key={item} className="flex items-center gap-3 text-sm font-semibold text-black"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Check className="h-3.5 w-3.5" /></span>{item}</div>)}</div>
          </div>
          <p className="text-xs font-semibold text-black">Business. Simplified. Success Amplified.</p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-[#f5f8fc] text-black">
        <header className="flex h-20 items-center justify-between px-5 sm:px-8 lg:px-12"><Link href="/" className="brand-lockup lg:hidden"><span className="brand-mark">B</span><span className="brand-wordmark">BIZYBUK<span>.IN</span></span></Link><div className="ml-auto text-sm font-semibold text-black">New to BIZYBUK.IN? <Link href="/signup" className="font-black text-black underline decoration-blue-500 decoration-2 underline-offset-4">Create a shop</Link></div></header>
        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-8 lg:px-12 lg:pb-16">
          <div className="w-full max-w-xl">
            <div className="mb-8 max-w-lg"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Smartphone className="h-6 w-6" /></div><p className="text-xs font-black uppercase tracking-[.18em] text-black">Welcome back</p><h2 className="mt-2 text-3xl font-black tracking-[-.035em] text-black sm:text-4xl">Continue to your workspace</h2><p className="mt-3 text-sm leading-6 text-black sm:text-base">Sign in to your BIZYBUK.IN business workspace or customer portal.</p></div>
            <form onSubmit={handleLogin} className="rounded-[28px] border border-slate-300 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-7">
              <div><label htmlFor="phone" className="mb-2 block text-sm font-bold text-black">Mobile number</label><div className="relative"><Smartphone className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-black" /><input id="phone" type="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={`${inputClass} pl-11 pr-3`} /></div></div>
              <div className="mt-5"><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-bold text-black">Password</label><Link href="/forgot-password" className="text-sm font-black text-black underline decoration-blue-500 decoration-2 underline-offset-4">Forgot password?</Link></div><div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-black" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className={`${inputClass} pl-11 pr-11`} /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-black hover:bg-slate-100" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
              <button type="submit" disabled={loading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing you in...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}</button>
              <p className="mt-4 text-center text-xs leading-5 text-black">One BIZYBUK.IN account can be active on one device at a time.</p>
            </form>
            <div className="mt-6 space-y-3 text-center text-sm text-black"><p>Opening a shop? <Link href="/signup" className="font-black text-black underline decoration-blue-500 decoration-2 underline-offset-4">Create Shop Account</Link></p><p>Already a customer? <Link href="/customer-signup" className="font-black text-black underline decoration-blue-500 decoration-2 underline-offset-4">Create Customer Account</Link></p><a href={supportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-black"><MessageCircle className="h-4 w-4 text-blue-600" /> Questions or suggestions? Contact support</a></div>
          </div>
        </div>
      </section>

      {showTakeover && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="device-switch-title">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-black shadow-2xl sm:p-7">
          <button type="button" onClick={() => setShowTakeover(false)} disabled={takeoverLoading} className="absolute right-4 top-4 rounded-xl p-2 text-black hover:bg-slate-100" aria-label="Cancel"><X className="h-5 w-5" /></button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><AlertTriangle className="h-6 w-6" /></div>
          <h3 id="device-switch-title" className="mt-5 text-2xl font-black tracking-tight text-black">This account is in use</h3>
          <p className="mt-2 text-sm leading-6 text-black">Your BIZYBUK.IN account is currently signed in on another device.</p>
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-black text-black">Before you switch devices</p><p className="mt-1.5 text-sm leading-6 text-black">If the other device has an unsaved sale, purchase, invoice, stock change, or any other transaction in progress, <strong>that unsaved data will be lost</strong> when the other device is signed out.</p></div>
          <p className="mt-4 text-xs leading-5 text-black">Saved transactions already stored in BIZYBUK.IN are not deleted. Only unsaved work on the other device may be lost.</p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowTakeover(false)} disabled={takeoverLoading} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-black text-black hover:bg-slate-50">Cancel</button><button type="button" onClick={takeover} disabled={takeoverLoading} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">{takeoverLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Logout other device &amp; continue</button></div>
        </div>
      </div>}
    </main>
  )
}
