import Link from 'next/link'
import { BarChart3, Package, ShoppingCart, Users, WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardAnalytics from './dashboard-analytics'
import StaffDashboard from './staff-dashboard'

const adminLinks = [
  { title: 'Sales', description: 'Invoices, collections and customer transactions', href: '/dashboard/sales', icon: ShoppingCart },
  { title: 'Inventory', description: 'Products, stock and purchase activity', href: '/dashboard/products', icon: Package },
  { title: 'Parties', description: 'Customers, suppliers and outstanding balances', href: '/dashboard/parties', icon: Users },
  { title: 'Expenses', description: 'Operating costs and finance records', href: '/dashboard/expenses', icon: WalletCards },
]

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

  if (profile.role === 'admin') {
    return (
      <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-5 overflow-x-hidden pb-6">
        <section className="relative overflow-hidden rounded-[30px] border border-emerald-200 bg-gradient-to-br from-[#f0fbf4] via-[#e2f5e8] to-[#ccebd8] p-5 shadow-[0_14px_40px_rgba(22,101,52,.08)] sm:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/70 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-emerald-800">
                <BarChart3 className="h-3.5 w-3.5" /> Admin business control
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-[-.04em] text-slate-950 sm:text-[32px]">
                Welcome, {profile.full_name || 'Admin'}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Monitor sales, purchases, profit, cash, stock and outstanding accounts from one responsive workspace.
              </p>
            </div>
            <Link href="/dashboard/analysis" className="inline-flex w-fit shrink-0 items-center rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800">
              Open full analysis →
            </Link>
          </div>
          <div className="relative mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {adminLinks.map(({ title, description, href, icon: Icon }) => (
              <Link key={title} href={href} className="group min-w-0 rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-black text-slate-900">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                <span className="mt-3 block text-[11px] font-black text-emerald-700 opacity-70 transition group-hover:opacity-100">Open details →</span>
              </Link>
            ))}
          </div>
        </section>

        <DashboardAnalytics />
      </div>
    )
  }

  if (profile.role === 'staff') {
    return <div className="mx-auto w-full max-w-[1500px] min-w-0 space-y-6 overflow-x-hidden"><StaffDashboard /></div>
  }

  const cards = [
    { title: 'Products', description: 'Manage products, brands, categories and stock.', icon: Package, href: '/dashboard/products' },
    { title: 'Sales', description: 'Create invoices and manage customer transactions.', icon: ShoppingCart, href: '/dashboard/sales' },
    { title: 'Parties', description: 'Customers, suppliers and their account balances.', icon: Users, href: '/dashboard/parties' },
    { title: 'Expenses', description: 'Record business expenses and keep finance updated.', icon: WalletCards, href: '/dashboard/expenses' },
  ]

  return <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 overflow-x-hidden">
    <section className="biz-dashboard-hero overflow-hidden rounded-[28px] p-6 sm:p-8">
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[.12em] text-emerald-700">BIZYBUK.IN · Business Workspace</span>
      <h1 className="mt-4 text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">Welcome, {profile.full_name}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Run sales, purchases, inventory and customer accounts from one clear workspace.</p>
    </section>
    <section className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => { const Icon = card.icon; return <Link key={card.title} href={card.href} className="biz-dashboard-card group min-w-0 rounded-[22px] p-5"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Icon className="h-5 w-5" /></span><h2 className="mt-4 font-black text-slate-900">{card.title}</h2><p className="mt-1 text-sm leading-5 text-slate-600">{card.description}</p><span className="mt-4 inline-flex text-xs font-black text-emerald-700 opacity-0 transition group-hover:opacity-100">Open workspace →</span></Link> })}
    </section>
  </div>
}
