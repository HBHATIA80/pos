import Link from 'next/link'
import { Package, ShoppingCart, Users, WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardAnalytics from './dashboard-analytics'
import StaffDashboard from './staff-dashboard'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('full_name, role, business_id, is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active) return null

  if (profile.role === 'admin') return <div className="mx-auto max-w-[1500px] space-y-6"><DashboardAnalytics /></div>
  if (profile.role === 'staff') return <div className="mx-auto max-w-[1500px] space-y-6"><StaffDashboard /></div>

  const cards = [
    { title: 'Products', description: 'Manage products, brands, categories and stock.', icon: Package, href: '/dashboard/products' },
    { title: 'Sales', description: 'Create invoices and manage customer transactions.', icon: ShoppingCart, href: '/dashboard/sales' },
    { title: 'Parties', description: 'Customers, suppliers and their account balances.', icon: Users, href: '/dashboard/parties' },
    { title: 'Expenses', description: 'Record business expenses and keep finance updated.', icon: WalletCards, href: '/dashboard/expenses' },
  ]

  return <div className="mx-auto max-w-7xl space-y-6">
    <section className="biz-dashboard-hero overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-white via-blue-50/60 to-indigo-50 p-6 shadow-sm sm:p-8">
      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[.12em] text-blue-700">BIZYBUK.IN · Business Workspace</span>
      <h1 className="mt-4 text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">Welcome, {profile.full_name}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">Run sales, purchases, inventory and customer accounts from one clear workspace.</p>
    </section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => { const Icon = card.icon; return <Link key={card.title} href={card.href} className="biz-dashboard-card group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></span><h2 className="mt-4 font-black text-slate-900">{card.title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{card.description}</p><span className="mt-4 inline-flex text-xs font-black text-blue-600 opacity-0 transition group-hover:opacity-100">Open workspace →</span></Link> })}
    </section>
  </div>
}
