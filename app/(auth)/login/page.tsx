'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Smartphone, Lock, Eye, EyeOff, ArrowRight, Loader2, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

const supportUrl = 'https://wa.me/919996609399?text=I%20have%20a%20question%20about%20BIZYBUK.IN'

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
      toast.success('You are signed in')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Unable to sign in')
    } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 shadow-sm"><span className="text-sm font-black text-white">B</span></div><span className="text-xl font-black tracking-tight text-slate-900">BIZYBUK<span className="text-indigo-600">.IN</span></span></Link>
      <div className="flex items-center gap-4 text-sm"><Link href="/signup" className="font-semibold text-slate-600 hover:text-indigo-600">New shop</Link><Link href="/customer-signup" className="font-semibold text-indigo-600 hover:text-indigo-700">Customer signup</Link></div>
    </div></header>
    <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8 sm:px-6"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
      <div className="mb-8 text-center"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50"><Smartphone className="h-8 w-8 text-indigo-600" /></div><h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Continue to your workspace</h1><p className="mt-2 text-sm text-slate-500">Sign in to BIZYBUK.IN POS or your Customer Portal.</p></div>
      <form onSubmit={handleLogin} className="space-y-5">
        <div><label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-700">Mobile Number</label><div className="relative"><Smartphone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id="phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 9876543210" className="input pl-10" /></div></div>
        <div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-sm font-medium text-slate-700">Password</label><Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Forgot password?</Link></div><div className="relative"><Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="input pl-10 pr-12" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
        <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">{loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing in...</> : <>Continue <ArrowRight className="h-4 w-4" /></>}</button>
      </form>
      <div className="mt-7 space-y-3 border-t border-slate-100 pt-6 text-center text-sm text-slate-500"><p>Opening a shop? <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">Create Shop Account</Link></p><p>Already a customer? <Link href="/customer-signup" className="font-semibold text-indigo-600 hover:text-indigo-700">Create Customer Account</Link></p><a href={supportUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700"><MessageCircle className="h-4 w-4" /> Questions or suggestions? Contact BIZYBUK.IN support</a></div>
    </div></section>
  </main>
}
