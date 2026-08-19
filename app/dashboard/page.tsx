import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, LogOut, ShieldCheck, Smartphone, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, role, business_id')
    .eq('id', user.id)
    .maybeSingle()

  const { data: business } = profile?.business_id
    ? await supabase.from('businesses').select('name, phone').eq('id', profile.business_id).maybeSingle()
    : { data: null }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Smartphone className="h-5 w-5 text-white" />
            </span>
            <span className="text-xl font-bold text-slate-900">
              Partronix<span className="text-blue-600">.in</span>
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Phase 2 · Authentication
              </span>
              <h1 className="mt-4 text-3xl font-bold text-slate-950">
                Welcome, {profile?.full_name ?? 'Admin'}
              </h1>
              <p className="mt-2 text-slate-500">
                Your mobile-number + password account is connected to Supabase.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="font-semibold text-slate-900">Role</div>
              <div className="mt-1 capitalize text-blue-600">{profile?.role ?? 'user'}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 p-5">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h2 className="mt-3 font-semibold text-slate-900">Business</h2>
              <p className="mt-1 text-sm text-slate-600">{business?.name ?? 'Business not found'}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 p-5">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              <h2 className="mt-3 font-semibold text-slate-900">Secure session</h2>
              <p className="mt-1 text-sm text-slate-600">Protected by Supabase Auth and server-side session checks.</p>
            </article>
            <article className="rounded-2xl border border-slate-200 p-5">
              <Users className="h-6 w-6 text-blue-600" />
              <h2 className="mt-3 font-semibold text-slate-900">Next phase</h2>
              <p className="mt-1 text-sm text-slate-600">Admin and staff permissions will be added next.</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  )
}
