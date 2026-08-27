'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, MessageCircle, Smartphone, Zap } from 'lucide-react'
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

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    if (loading) return
    const cleanPhone = phone.trim()
    if (!cleanPhone) return toast.error('Please enter your mobile number')
    if (!password) return toast.error('Please enter your password')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ phone: cleanPhone, password })
      if (error) { toast.error(error.message); return }

      const sessionResponse = await fetch('/api/auth/session', { method: 'POST', credentials: 'include' })
      const sessionBody = await sessionResponse.json().catch(() => ({}))
      if (!sessionResponse.ok) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
        if (sessionResponse.status === 409) {
          toast.error(concurrentLoginMessage, { duration: 6000 })
        } else {
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

  const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'

  return (
    <main className="min-h-screen bg-[#f5f8fc] text-slate-950 lg:grid lg:grid-cols-[.95fr_1.05fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#06101f] text-white lg:flex lg:flex-col">
        <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative flex flex-1 flex-col px-10 py-8 xl:px-16">
          <Link href="/" className="brand-lockup w-fit"><span className="brand-mark">B</span><span className="brand-wordmark text-white">BIZYBUK<span>.IN</span></span></Link>
          <div className="my-auto max-w-xl pb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-blue-200"><Zap className="h-3.5 w-3.5" /> Fast · Secure · Smart</div>
            <h1 className="mt-7 text-5xl font-black italic leading-[1.02] tracking-[-.055em] xl:text-6xl">Run your business,<br /><span className="text-blue-400">with clarity.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">Sales, inventory, customers, payments and everyday work — all in one clear BIZYBUK.IN workspace.</p>
            <div className="mt-9 space-y-3">
              {['One workspace for your daily business', 'Fast access to sales, stock and accounts', 'Secure access wherever you work'].map(item => <div key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-200"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-blue-300"><Check className="h-3.5 w-3.5" /></span>{item}</div>)}
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500">Business. Simplified. Success Amplified.</p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col">
        <header className="flex h-20 items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="brand-lockup lg:hidden"><span className="brand-mark">B</span><span className="brand-wordmark">BIZYBUK<span>.IN</span></span></Link>
          <div className="ml-auto text-sm font-semibold text-slate-500">New to BIZYBUK.IN? <Link href="/signup" className="font-black text-blue-600 hover:text-blue-700">Create a shop</Link></div>
        </header>
        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-8 lg:px-12 lg:pb-16">
          <div className="w-full max-w-xl">
            <div className="mb-8 max-w-lg">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Smartphone className="h-6 w-6" /></div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Welcome back</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">Continue to your workspace</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">Sign in to your BIZYBUK.IN business workspace or customer portal.</p>
            </div>
            <form onSubmit={handleLogin} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-7">
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-bold text-slate-800">Mobile number</label>
                <div className="relative"><Smartphone className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="phone" type="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={`${inputClass} pl-11 pr-3`} /></div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-bold text-slate-800">Password</label><Link href="/forgot-password" className="text-sm font-black text-blue-600 hover:text-blue-700">Forgot password?</Link></div>
                <div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className={`${inputClass} pl-11 pr-11`} /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              </div>
              <button type="submit" disabled={loading} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70">{loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing you in...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}</button>
              <p className="mt-4 text-center text-xs leading-5 text-slate-400">One BIZYBUK.IN account can be active on one device at a time.</p>
            </form>
            <div className="mt-6 space-y-3 text-center text-sm text-slate-500"><p>Opening a shop? <Link href="/signup" className="font-black text-blue-600">Create Shop Account</Link></p><p>Already a customer? <Link href="/customer-signup" className="font-black text-blue-600">Create Customer Account</Link></p><a href={supportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-700"><MessageCircle className="h-4 w-4" /> Questions or suggestions? Contact support</a></div>
          </div>
        </div>
      </section>
    </main>
  )
}
