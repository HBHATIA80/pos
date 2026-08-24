import Link from 'next/link'
import { ArrowRight, BarChart3, BookOpenCheck, Boxes, Check, CreditCard, IndianRupee, LayoutDashboard, PackageCheck, ShieldCheck, ShoppingCart, Smartphone, Store, UsersRound } from 'lucide-react'

const features = [
  { icon: LayoutDashboard, title: 'One business workspace', text: 'Manage sales, purchases, inventory, customers, payments, expenses and ledgers from one connected workspace.' },
  { icon: ShoppingCart, title: 'Fast POS & billing', text: 'A desktop-first billing experience with quick product search, customer selection, payment collection and receipts.' },
  { icon: Boxes, title: 'Inventory control', text: 'Track stock movements, purchases, sales, adjustments and low-stock items with role-based access.' },
  { icon: UsersRound, title: 'Staff & customer roles', text: 'Keep admin, staff and customer experiences separate so every person sees only what they need.' },
  { icon: Smartphone, title: 'Works across devices', text: 'Responsive interfaces for shop counters, laptops, tablets and customer phones.' },
  { icon: ShieldCheck, title: 'Business-scoped data', text: 'Accounts, transactions and customer access are designed around the individual shop or business.' },
]

const modules = ['Sales & POS', 'Products & catalog', 'Inventory', 'Purchases', 'Customers & parties', 'Payments & receipts', 'Expenses', 'Ledgers', 'Orders', 'Business analysis', 'Staff permissions', 'Customer portal']

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-900">
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(99,102,241,.30),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,.20),transparent_28%),linear-gradient(180deg,#0f172a,#111827)] text-white">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15"><BookOpenCheck className="h-5 w-5" /></span>
              <span className="text-xl font-black tracking-tight">BIZ<span className="text-indigo-300">Book</span></span>
            </Link>
            <div className="hidden items-center gap-7 text-sm font-semibold text-slate-300 md:flex">
              <a href="#features" className="hover:text-white">Features</a><a href="#modules" className="hover:text-white">Modules</a><a href="#pricing" className="hover:text-white">Pricing</a>
            </div>
            <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">Login</Link><Link href="/signup" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg hover:bg-slate-100">Start free</Link></div>
          </nav>

          <div className="grid gap-12 pb-20 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-bold text-indigo-200"><IndianRupee className="h-3.5 w-3.5" /> Indian startup · free test phase</div>
              <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">Run your shop with one <span className="text-indigo-300">simple business book.</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">BIZBook brings POS billing, products, inventory, purchases, customers, payments, ledgers, orders and business insights together for growing Indian shops.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 font-bold text-slate-950 shadow-xl hover:bg-slate-100">Create your free shop <ArrowRight className="h-4 w-4" /></Link><Link href="/customer-signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 font-bold text-white hover:bg-white/10">Customer portal</Link></div>
              <p className="mt-4 text-xs font-medium text-slate-400">Free while BIZBook is in its early test phase. Future pricing may be introduced.</p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[0.06] p-3 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[22px] bg-slate-50 p-4 text-slate-900 sm:p-5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4"><div><p className="text-xs font-bold text-indigo-600">BIZBook POS</p><p className="mt-1 font-black">Today at your shop</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Live workspace</span></div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Sales','₹42,850'],['Orders','38'],['Products','1,284'],['Low stock','12']].map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>)}</div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Sales & billing</p><p className="mt-1 text-xs text-slate-500">Fast search · customer · payment · receipt</p></div><CreditCard className="h-6 w-6 text-indigo-500" /></div><div className="mt-4 flex gap-2"><div className="h-2 flex-1 rounded-full bg-indigo-500"/><div className="h-2 w-1/4 rounded-full bg-slate-200"/></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-sm font-black uppercase tracking-[.18em] text-indigo-600">Everything connected</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Built for the way a real shop operates.</h2><p className="mt-4 leading-7 text-slate-600">From the counter to the customer phone, BIZBook keeps the important business flows connected without making the interface complicated.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({icon:Icon,title,text}) => <article key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><Icon className="h-5 w-5"/></span><h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>

      <section id="modules" className="bg-slate-50 px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-center"><div><p className="text-sm font-black uppercase tracking-[.18em] text-indigo-600">One platform</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">A complete shop operations toolkit.</h2><p className="mt-4 leading-7 text-slate-600">Start with what you need today and keep expanding as the business grows.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">Try BIZBook free <ArrowRight className="h-4 w-4"/></Link></div><div className="grid gap-3 sm:grid-cols-2">{modules.map((module) => <div key={module} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-4 w-4"/></span><span className="text-sm font-bold text-slate-800">{module}</span></div>)}</div></div></section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto max-w-7xl grid gap-6 md:grid-cols-3"><article className="rounded-3xl bg-slate-950 p-7 text-white md:col-span-2"><Store className="h-7 w-7 text-indigo-300"/><h2 className="mt-5 text-2xl font-black">For shop owners & staff</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Powerful tools for billing, stock, purchasing, accounts and operations. Staff access can be controlled with permissions.</p></article><article className="rounded-3xl border border-slate-200 bg-slate-50 p-7"><PackageCheck className="h-7 w-7 text-emerald-600"/><h2 className="mt-5 text-2xl font-black">For customers</h2><p className="mt-2 text-sm leading-6 text-slate-600">A clean customer portal with shop identity, product browsing, ordering and personal ledger access.</p></article></div></section>

      <section id="pricing" className="bg-slate-950 px-5 py-20 text-white sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto max-w-5xl text-center"><p className="text-sm font-black uppercase tracking-[.18em] text-indigo-300">Pricing</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">Free while we build with businesses.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">BIZBook is currently available at no charge during its Indian startup test phase. We will share future plans and pricing clearly before introducing paid features.</p><div className="mx-auto mt-10 max-w-md rounded-[28px] border border-white/10 bg-white/[0.06] p-7 text-left shadow-2xl"><div className="flex items-end justify-between"><div><p className="text-sm font-bold text-indigo-200">Early access</p><p className="mt-2 text-5xl font-black">₹0</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Currently free</span></div><div className="mt-7 space-y-3">{['Core shop workspace','POS & sales','Inventory & products','Customer portal','Orders, payments & ledgers'].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-slate-200"><Check className="h-4 w-4 text-emerald-400"/>{item}</div>)}</div><Link href="/signup" className="mt-7 flex min-h-12 items-center justify-center rounded-2xl bg-white font-bold text-slate-950 hover:bg-slate-100">Start free</Link></div></div></section>

      <footer className="bg-slate-950 px-5 pb-10 text-center text-xs text-slate-500 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 sm:flex-row"><span>© {new Date().getFullYear()} BIZBook · Indian startup in early test phase</span><span>Business & POS software for growing shops</span></div></footer>
    </main>
  )
}
