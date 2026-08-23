'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2, Smartphone, Store, User } from 'lucide-react'
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

    const cleanName = fullName.trim()
    const cleanCode = shopCode.trim().toUpperCase()
    const cleanPhone = phone.trim()

    if (cleanName.length < 2) return toast.error('Please enter your full name')
    if (!cleanCode) return toast.error('Please enter the shop code')
    if (!cleanPhone) return toast.error('Please enter your mobile number')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    if (password !== confirmPassword) return toast.error('Passwords do not match')

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        phone: cleanPhone,
        password,
        options: {
          data: {
            account_type: 'customer',
            business_code: cleanCode,
            full_name: cleanName,
          },
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (!data.user) {
        toast.error('Unable to create customer account')
        return
      }

      if (!data.session) {
        toast.success('Customer account created. Please sign in.')
        router.push('/login')
        return
      }

      toast.success('Customer account created')
      router.replace('/dashboard/orders')
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Unable to create customer account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Partronix<span className="text-blue-600">.in</span></span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-700">Login</Link>
        </div>
      </header>

      <section className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
              <Store className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create Customer Account</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Join an existing shop. This account is always a customer portal user, never a shop admin.</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="customer-name" className="mb-2 block text-sm font-medium text-slate-700">Full Name</label>
              <div className="relative"><User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id="customer-name" required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" className="input pl-10" /></div>
            </div>

            <div>
              <label htmlFor="shop-code" className="mb-2 block text-sm font-medium text-slate-700">Shop Code</label>
              <div className="relative"><Store className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id="shop-code" required value={shopCode} onChange={(event) => setShopCode(event.target.value.toUpperCase())} placeholder="SHOP-XXXXXXXX" className="input pl-10 uppercase" /></div>
              <p className="mt-1.5 text-xs text-slate-500">Use the code provided by the shop.</p>
            </div>

            <div>
              <label htmlFor="customer-phone" className="mb-2 block text-sm font-medium text-slate-700">Mobile Number</label>
              <div className="relative"><Smartphone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input id="customer-phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 9876543210" className="input pl-10" /></div>
            </div>

            <div>
              <label htmlFor="customer-password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative"><input id="customer-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 6 characters" className="input pr-12" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            </div>

            <div>
              <label htmlFor="customer-confirm" className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
              <div className="relative"><input id="customer-confirm" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" className="input pr-12" /><button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating Account...</> : <>Create Customer Account <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
            <p>Opening a shop? <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">Create a Shop Account</Link></p>
          </div>
        </div>
      </section>
    </main>
  )
}
