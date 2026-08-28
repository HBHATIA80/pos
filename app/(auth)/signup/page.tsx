'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Smartphone, ShoppingCart, Store, User, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

type FormFieldProps = { label: string; id: string; children: React.ReactNode }

function FormField({ label, id, children }: FormFieldProps) {
  return <div><label htmlFor={id} className="mb-2 block text-sm font-bold text-slate-950">{label}</label>{children}</div>
}

function HomeBrand() {
  return (
    <Link href="/" aria-label="BIZYBUK.IN home" className="flex w-fit items-center gap-3">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-[11px] border-[3px] border-[#18795c] bg-white text-[18px] font-black text-[#18795c] shadow-sm">
        <ShoppingCart className="absolute h-6 w-6" strokeWidth={2.8} />
        <span className="relative z-10 mt-0.5 text-[15px] font-black text-white">B</span>
      </span>
      <span className="text-[23px] font-black tracking-[-.055em] text-[#17382f]">
        BIZYBUK<span className="text-[#18795c]">.IN</span>
      </span>
    </Link>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    const cleanPhone = phone.trim(); const cleanName = fullName.trim(); const cleanBusiness = businessName.trim()
    if (!cleanName) return toast.error('Please enter your full name')
    if (!cleanBusiness) return toast.error('Please enter your shop or business name')
    if (!cleanPhone) return toast.error('Please enter your mobile number')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    if (password !== confirmPassword) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ phone: cleanPhone, password, options: { data: { full_name: cleanName, business_name: cleanBusiness } } })
      if (error) { toast.error(error.message); return }
      if (!data.user) { toast.error('Unable to create account'); return }
      toast.success('Account created successfully')
      if (data.session) { router.push('/dashboard'); router.refresh() } else { toast.success('Account created. Please sign in.'); router.push('/login') }
    } catch (error) { console.error(error); toast.error('Something went wrong while creating the account') }
    finally { setLoading(false) }
  }

  const inputClass = 'h-12 w-full rounded-xl border-2 border-slate-300 bg-white text-base font-medium text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-[#0f8f83] focus:bg-white focus:ring-4 focus:ring-[#0f8f83]/15'

  return (
    <main className="min-h-screen bg-[#f4f8f7] text-slate-950 lg:grid lg:grid-cols-[.95fr_1.05fr]">
      <section className="biz-login-hero relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-[#e8f6f2] via-white to-[#e9f5f3] text-slate-950 lg:flex lg:flex-col lg:border-r-2 lg:border-slate-200">
        <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-[30rem] w-[30rem] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative flex flex-1 flex-col px-10 py-8 xl:px-16">
          <HomeBrand />
          <div className="my-auto max-w-xl pb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider text-[#087f73] shadow-sm"><Zap className="h-3.5 w-3.5" /> Fast · Secure · Smart</div>
            <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-[-.055em] text-slate-950 xl:text-6xl">Run your business,<br /><span className="text-[#087f73]">with clarity.</span></h1>
            <p className="mt-6 max-w-lg text-base font-medium leading-7 text-slate-800">Sales, inventory, customers, payments and everyday work — all in one clear BIZYBUK.IN workspace.</p>
            <div className="mt-9 space-y-4">
              {['One workspace for your daily business', 'Fast access to sales, stock and accounts', 'Secure access wherever you work'].map(item => <div key={item} className="biz-login-feature flex items-center gap-3 text-base font-bold text-slate-900"><span className="biz-login-feature-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0f8f83] text-white shadow-sm"><Check className="h-4 w-4" strokeWidth={3} /></span><span>{item}</span></div>)}
            </div>
          </div>
          <p className="text-sm font-bold text-slate-700">Business. Simplified. Success Amplified.</p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col bg-[#f7fbfa]">
        <header className="flex min-h-20 items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <div className="lg:hidden"><HomeBrand /></div>
          <div className="ml-auto text-right text-sm font-semibold text-slate-700">Already have an account? <Link href="/login" className="font-black text-[#087f73] hover:text-[#06665d]">Sign in</Link></div>
        </header>
        <div className="flex flex-1 items-center justify-center px-5 pb-10 pt-2 sm:px-8 lg:px-12 lg:pb-16">
          <div className="w-full max-w-xl">
            <div className="mb-8 max-w-lg">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#087f73]"><Store className="h-6 w-6" strokeWidth={2.5} /></div>
              <p className="text-xs font-black uppercase tracking-[.18em] text-[#087f73]">Get started</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">Create your business account</h2>
              <p className="mt-3 text-base font-medium leading-6 text-slate-700">Set up your account and get your business moving.</p>
            </div>
            <form onSubmit={handleSignup} className="rounded-[28px] border-2 border-slate-200 bg-white p-5 shadow-xl shadow-slate-300/40 sm:p-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Your name" id="fullName"><div className="relative"><User className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-600" /><input id="fullName" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your name" className={`${inputClass} pl-11 pr-3`} /></div></FormField>
                <FormField label="Business name" id="businessName"><div className="relative"><Store className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-600" /><input id="businessName" type="text" autoComplete="organization" enterKeyHint="next" required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Enter your business name" className={`${inputClass} pl-11 pr-3`} /></div></FormField>
              </div>
              <div className="mt-5"><FormField label="Mobile number" id="phone"><div className="relative"><Smartphone className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-600" /><input id="phone" type="tel" inputMode="tel" autoComplete="tel" autoCapitalize="none" autoCorrect="off" enterKeyHint="next" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className={`${inputClass} pl-11 pr-3`} /></div><p className="mt-2 text-xs font-medium text-slate-500">Use your mobile number with country code.</p></FormField></div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <FormField label="Password" id="password"><div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-600" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" enterKeyHint="next" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" className={`${inputClass} pl-11 pr-11`} /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></FormField>
                <FormField label="Confirm password" id="confirmPassword"><div className="relative"><Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-600" /><input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" enterKeyHint="done" required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className={`${inputClass} pl-11 pr-11`} /><button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></FormField>
              </div>
              <button type="submit" disabled={loading} style={{ color: '#ffffff' }} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0f8f83] px-5 !text-white font-black shadow-lg shadow-[#0f8f83]/25 transition hover:bg-[#0b776d] disabled:cursor-not-allowed disabled:opacity-70">{loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating your account...</> : <>Create account <ArrowRight className="h-4 w-4" /></>}</button>
              <p className="mt-4 text-center text-xs font-medium leading-5 text-slate-500">By creating an account, you’re ready to start managing your business.</p>
            </form>
            <p className="mt-6 text-center text-sm font-medium text-slate-700">Already have an account? <Link href="/login" className="font-black text-[#087f73] hover:text-[#06665d]">Sign in</Link></p>
          </div>
        </div>
      </section>
    </main>
  )
}
