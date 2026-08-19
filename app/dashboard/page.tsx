import Link from 'next/link'
import { BarChart3, Package, ShoppingCart, Users, WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, business_id, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_active) return null

  const cards = [
    {
      title: 'Products',
      description: 'Products, brands, categories and stock will be added in the catalog phase.',
      icon: Package,
      href: '#',
      label: 'Coming next',
    },
    {
      title: 'Sales',
      description: 'Create sale invoices and manage customer transactions in a later phase.',
      icon: ShoppingCart,
      href: '#',
      label: 'Coming next',
    },
    {
      title: 'Parties',
      description: 'Customers, suppliers and their ledgers will be connected to transactions later.',
      icon: Users,
      href: '#',
      label: 'Coming next',
    },
    {
      title: 'Expenses',
      description: 'Expense recording and financial summaries will arrive with the accounts modules.',
      icon: WalletCards,
      href: '#',
      label: 'Coming next',
    },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Phase 4 · POS Shell
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Welcome, {profile.full_name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Your POS workspace is ready. The navigation, mobile layout and desktop shell are now in place so future modules can be added without changing the overall structure.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm">
              <span className="font-semibold text-slate-700">Role</span>
              <span className="capitalize text-blue-700">{profile.role}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {card.label}
                </span>
              </div>
              <h2 className="mt-4 font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">{card.description}</p>
            </article>
          )
        })}
      </section>

      {profile.role === 'admin' && (
        <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-700">
                <BarChart3 className="h-5 w-5" />
                <h2 className="font-semibold">Admin workspace</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Team management is available now. Business analysis and P&amp;L will be connected after transactions are implemented.
              </p>
            </div>
            <Link
              href="/dashboard/team"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Manage team
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
