import Link from 'next/link'
import { BarChart3, Package, ShoppingCart, Users, WalletCards } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import DashboardAnalytics from './dashboard-analytics'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('full_name, role, business_id, is_active').eq('id', user.id).maybeSingle()
  if (!profile?.is_active) return null

  if (profile.role === 'admin') return <div className="mx-auto max-w-[1500px] space-y-6"><DashboardAnalytics /></div>

  const cards = [
    { title:'Products', description:'Manage products, brands, categories and stock.', icon:Package, href:'/dashboard/products' },
    { title:'Sales', description:'Create invoices and manage customer transactions.', icon:ShoppingCart, href:'/dashboard/sales' },
    { title:'Parties', description:'Customers, suppliers and their account balances.', icon:Users, href:'/dashboard/parties' },
    { title:'Expenses', description:'Record business expenses and keep finance updated.', icon:WalletCards, href:'/dashboard/expenses' },
  ]
  return <div className="mx-auto max-w-7xl space-y-6"><section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50 p-6 shadow-sm sm:p-8"><span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">BIZBook POS</span><h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Welcome, {profile.full_name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Run sales, purchases, inventory and customer accounts from one workspace.</p></section><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=>{const Icon=card.icon;return <Link key={card.title} href={card.href} className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5"/></span><h2 className="mt-4 font-black text-slate-900">{card.title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{card.description}</p></Link>})}</section></div>
}
