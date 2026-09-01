import Link from 'next/link'
import { BarChart3, ClipboardList, Package, Settings, ShoppingBag, ShoppingCart, Users, WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardAnalytics from './dashboard-analytics'
import StaffDashboard from './staff-dashboard'

type Role = 'admin' | 'staff' | 'user'

type QuickLink = {
  title: string
  description: string
  href: string
  icon: typeof Package
  accent: string
}

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

  const role = profile.role as Role

  if (role === 'admin') {
    return (
      <div className="mx-auto w-full max-w-[1540px] space-y-5">
        <DashboardAnalytics />
        <AdminQuickLinks />
      </div>
    )
  }

  if (role === 'staff') {
    return (
      <div className="mx-auto w-full max-w-[1540px]">
        <StaffDashboard />
      </div>
    )
  }

  const cards: QuickLink[] = [
    { title: 'Products', description: 'Manage products, brands, categories and stock.', icon: Package, href: '/dashboard/products', accent: 'bg-emerald-50 text-emerald-700' },
    { title: 'Sales', description: 'Create invoices and manage customer transactions.', icon: ShoppingCart, href: '/dashboard/sales', accent: 'bg-rose-50 text-rose-600' },
    { title: 'Parties', description: 'Customers, suppliers and account balances.', icon: Users, href: '/dashboard/parties', accent: 'bg-sky-50 text-sky-700' },
    { title: 'Expenses', description: 'Record operating expenses and keep finances updated.', icon: WalletCards, href: '/dashboard/expenses', accent: 'bg-amber-50 text-amber-700' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />
        <span className="relative inline-flex items-center rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-emerald-800 ring-1 ring-emerald-100">BIZYBUK.IN · Business workspace</span>
        <h1 className="relative mt-4 text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-4xl">Welcome, {profile.full_name}</h1>
        <p className="relative mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Run sales, inventory, customer accounts and expenses from one clean workspace.</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return <Link key={card.title} href={card.href} className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.accent}`}><Icon className="h-5 w-5" /></span><h2 className="mt-4 font-black text-slate-950">{card.title}</h2><p className="mt-1 text-sm leading-5 text-slate-600">{card.description}</p><span className="mt-4 inline-flex items-center text-xs font-black text-emerald-700">Open workspace <span className="ml-1 transition-transform group-hover:translate-x-1">→</span></span></Link>
        })}
      </section>
    </div>
  )
}

function AdminQuickLinks() {
  const links: QuickLink[] = [
    { title: 'New sale', description: 'Create a customer invoice and record payment.', href: '/dashboard/sales', icon: ShoppingCart, accent: 'bg-rose-50 text-rose-600' },
    { title: 'Inventory', description: 'Review stock, valuation and low-stock items.', href: '/dashboard/inventory', icon: Package, accent: 'bg-emerald-50 text-emerald-700' },
    { title: 'Parties', description: 'Review receivables, payables and account history.', href: '/dashboard/parties', icon: Users, accent: 'bg-sky-50 text-sky-700' },
    { title: 'Analysis', description: 'Open detailed accounting and business analysis.', href: '/dashboard/analysis', icon: BarChart3, accent: 'bg-violet-50 text-violet-700' },
    { title: 'Records', description: 'Browse operational records and invoice history.', href: '/dashboard/records', icon: ClipboardList, accent: 'bg-amber-50 text-amber-700' },
    { title: 'Settings', description: 'Manage shop configuration and administration.', href: '/dashboard/settings', icon: Settings, accent: 'bg-slate-100 text-slate-700' },
  ]

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-700">Admin shortcuts</p><h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Run the shop faster</h2><p className="mt-1 text-sm text-slate-500">Common tasks, one click away.</p></div>
        <Link href="/dashboard/team" className="text-xs font-black text-emerald-700 hover:text-slate-950">Manage team →</Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => { const Icon = link.icon; return <Link key={link.title} href={link.href} className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${link.accent}`}><Icon className="h-4.5 w-4.5" /></span><span className="min-w-0"><b className="block text-sm font-black text-slate-900">{link.title}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{link.description}</span></span><span className="ml-auto pt-1 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600">→</span></Link> })}
      </div>
    </section>
  )
}
