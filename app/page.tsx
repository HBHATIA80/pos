import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, Check, CreditCard, PackageCheck, ShieldCheck, ShoppingCart, Store, UsersRound, Zap } from 'lucide-react'

const features = [
  { icon: ShoppingCart, title: 'Fast billing', text: 'Desktop-first POS workflows built for speed at the counter.' },
  { icon: Boxes, title: 'Inventory control', text: 'Products, stock, categories and movements in one workspace.' },
  { icon: PackageCheck, title: 'Purchasing', text: 'Track supplier purchases and keep stock flowing cleanly.' },
  { icon: CreditCard, title: 'Accounts & ledgers', text: 'Payments, receipts, expenses and party balances connected.' },
  { icon: BarChart3, title: 'Business insights', text: 'See the numbers that matter without drowning in screens.' },
  { icon: UsersRound, title: 'Customer portal', text: 'Give customers a simple, branded ordering and account experience.' },
]

const modules = ['Sales & POS','Products','Inventory','Categories','Purchases','Parties','Payments','Receipts','Expenses','Ledgers','Orders','Customer portal']

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f8fc] text-slate-950">
      <section className="relative overflow-hidden bg-[#06101f] text-white">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
            <Link href="/" className="brand-lockup"><span className="brand-mark">B</span><span className="text-xl font-black italic tracking-[-.055em] text-white">BIZYBUK<span className="text-blue-400">.IN</span></span></Link>
            <div className="hidden items-center gap-7 text-sm font-bold text-slate-300 md:flex"><a href="#features" className="hover:text-white">Features</a><a href="#modules" className="hover:text-white">Modules</a><a href="#about" className="hover:text-white">Why BIZYBUK</a></div>
            <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10">Login</Link><Link href="/signup" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500">Start free</Link></div>
          </nav>

          <div className="grid gap-12 pb-20 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-28 lg:pt-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-blue-200"><Zap className="h-3.5 w-3.5"/> Fast · Secure · Smart</div>
              <h1 className="mt-6 max-w-4xl text-5xl font-black italic tracking-[-0.055em] sm:text-6xl lg:text-7xl">Business, <span className="text-blue-400">simplified.</span></h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">BIZYBUK.IN brings billing, inventory, purchasing, customers, payments, ledgers and business insights into one powerful workspace.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-black text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500">Create your shop <ArrowRight className="h-4 w-4"/></Link><Link href="/customer-signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 font-bold text-white hover:bg-white/10">Customer portal</Link></div>
              <div className="mt-8 flex flex-wrap gap-5 text-xs font-bold text-slate-400"><span>✓ No clutter</span><span>✓ Desktop ready</span><span>✓ Mobile friendly</span><span>✓ Role based access</span></div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/[.05] p-3 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[22px] bg-white p-5 text-slate-950 sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-blue-600">BIZYBUK.IN</p><p className="mt-1 text-lg font-black">Business command centre</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">LIVE</span></div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Sales','₹42,850'],['Orders','38'],['Products','1,284'],['Low stock','12']].map(([label,value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>)}</div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-black">Today at a glance</p><p className="mt-1 text-xs text-slate-500">Sales · stock · payments · receivables</p></div><BarChart3 className="h-6 w-6 text-blue-600"/></div><div className="mt-5 flex items-end gap-2">{[42,64,50,78,58,92,72].map((h,i)=><div key={i} className="flex-1 rounded-t-md bg-blue-600" style={{height:`${h}px`,opacity:.35+i*.08}}/>)}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto max-w-7xl"><p className="text-sm font-black uppercase tracking-[.18em] text-blue-600">Everything connected</p><h2 className="mt-3 max-w-3xl text-3xl font-black italic tracking-tight text-slate-950 sm:text-5xl">One clean workspace for the whole business.</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">Designed for real shop counters, laptops, tablets and customer phones — with less noise and more room for the work that matters.</p><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5"/></span><h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>

      <section id="modules" className="bg-[#f5f8fc] px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-black uppercase tracking-[.18em] text-blue-600">One platform</p><h2 className="mt-3 text-3xl font-black italic tracking-tight sm:text-5xl">Everything your shop needs.</h2><p className="mt-4 max-w-xl leading-7 text-slate-600">Start with billing and inventory, then expand into accounting, customer ordering and analytics as your business grows.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">Try BIZYBUK.IN <ArrowRight className="h-4 w-4"/></Link></div><div className="grid gap-3 sm:grid-cols-2">{modules.map(module=><div key={module} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Check className="h-4 w-4"/></span><span className="text-sm font-bold text-slate-800">{module}</span></div>)}</div></div></section>

      <section id="about" className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3"><article className="rounded-3xl bg-[#06101f] p-7 text-white md:col-span-2"><Store className="h-7 w-7 text-blue-400"/><h2 className="mt-5 text-2xl font-black italic">Powering businesses. Empowering growth.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">BIZYBUK.IN is built around the daily rhythm of a real business: sell, buy, stock, collect, pay, review and grow.</p></article><article className="rounded-3xl border border-slate-200 bg-slate-50 p-7"><ShieldCheck className="h-7 w-7 text-blue-600"/><h2 className="mt-5 text-2xl font-black">Built with control.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Role-based access keeps admin, staff and customers focused on exactly what they need.</p></article></div></section>

      <footer className="bg-[#06101f] px-5 py-10 text-white sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><Link href="/" className="flex items-center gap-3"><span className="brand-mark">B</span><span className="text-xl font-black italic tracking-[-.055em]">BIZYBUK<span className="text-blue-400">.IN</span></span></Link><p className="text-xs font-semibold text-slate-400">Business. Simplified. Success Amplified.</p></div></footer>
    </main>
  )
}
