import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, ShieldCheck, Smartphone, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, role, business_id, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active) redirect('/login')

  const { data: business } = profile.business_id
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
          <div className="flex items-center gap-2">
            {profile.role === 'admin' && (
              <Link href="/dashboard/team" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-600">
                <Users className="h-4 w-4" /> Team
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Phase 3 · Admin & Staff
              </span>
              <h1 className="mt-4 text-3xl font-bold text-slate-950">
                Welcome, {profile.full_name}
              </h1>
              <p className="mt-2 text-slate-500">
                Your business team and permissions are ready for the POS modules that come next.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <div className="font-semibold text-slate-900">Role</div>
              <div className="mt-1 capitalize text-blue-600">{profile.role}</div>
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
              <h2 className="mt-3 font-semibold text-slate-900">Permissions</h2>
              <p className="mt-1 text-sm text-slate-600">Admins have full access. Staff and users receive module permissions.</p>
            </article>
            <Link href={profile.role === 'admin' ? '/dashboard/team' : '/dashboard'} className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-sm">
              <Users className="h-6 w-6 text-blue-600" />
              <h2 className="mt-3 font-semibold text-slate-900">Team management</h2>
              <p className="mt-1 text-sm text-slate-600">{profile.role === 'admin' ? 'Add staff/users and manage access.' : 'Your assigned POS access will appear here as modules are added.'}</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
