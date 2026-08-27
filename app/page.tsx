import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, Check, ChevronDown, CreditCard, FileText, PackageCheck, ShieldCheck, ShoppingCart, Store, UsersRound, Zap } from 'lucide-react'

const features = [
  { icon: ShoppingCart, title: 'Point of sale', text: 'Fast, reliable billing built for busy counters and everyday transactions.' },
  { icon: Boxes, title: 'Inventory control', text: 'Track stock, low inventory and product movement without spreadsheets.' },
  { icon: PackageCheck, title: 'Purchasing', text: 'Keep supplier purchases organized and your stock replenished.' },
  { icon: CreditCard, title: 'Payments & accounts', text: 'Connect receipts, expenses, parties and balances in one place.' },
  { icon: BarChart3, title: 'Business insights', text: 'See what is selling, what is changing and where to focus next.' },
  { icon: UsersRound, title: 'Customer experience', text: 'Give customers a clean portal for browsing, ordering and updates.' },
]

const modules = ['Sales & POS', 'Products', 'Inventory', 'Categories', 'Purchases', 'Parties', 'Payments', 'Receipts', 'Expenses', 'Ledgers', 'Orders', 'Customer portal']

function Brand() {
  return <Link href="/" className="brand-lockup" aria-label="BIZYBUK.IN home">
    <span className="brand-mark">B</span>
    <span className="brand-wordmark">BIZYBUK<span>.IN</span></span>
  </Link>
}

function DashboardPreview() {
  return <div className="relative mx-auto w-full max-w-[650px] lg:ml-auto">
    <div className="absolute -inset-8 rounded-[48px] bg-blue-100/60 blur-3xl" />
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_30px_90px_rgba(25,55,100,.16)]">
      <div className="flex h-12 items-center justify-between border-b border-slate-100 px-4 sm:px-5">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/><span className="h-2.5 w-2.5 rounded-full bg-slate-200"/></div>
        <div className="rounded-lg bg-slate-50 px-3 py-1 text-[10px] font-bold text-slate-500">BIZYBUK.IN · BUSINESS</div>
      </div>
      <div className="grid grid-cols-[52px_1fr] sm:grid-cols-[68px_1fr]">
        <aside className="border-r border-slate-100 bg-slate-50/80 p-2 sm:p-3">
          <div className="mb-5 flex h-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">B</div>
          {[Store, ShoppingCart, Boxes, UsersRound, BarChart3, FileText].map((Icon, i) => <div key={i} className={`mb-2 flex h-8 items-center justify-center rounded-lg ${i === 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><Icon className="h-4 w-4"/></div>)}
        </aside>
        <div className="min-w-0 bg-white p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Overview</p><h3 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">Good morning, Admin</h3></div>
            <span className="hidden rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 sm:inline">Today · Aug 27</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {[['₹42,850','Sales','+12.8%'],['38','Orders','+8.4%'],['1,284','Products','Active'],['12','Low stock','Attention']].map(([value,label,meta],i)=><div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-base font-extrabold text-slate-900 sm:text-lg">{value}</p><p className={`mt-1 text-[9px] font-bold ${i === 3 ? 'text-amber-600' : 'text-emerald-600'}`}>{meta}</p></div>)}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-slate-100 p-3 sm:p-4"><div className="flex items-center justify-between"><p className="text-xs font-extrabold text-slate-800">Sales overview</p><span className="text-[9px] font-bold text-slate-400">Last 7 days</span></div><div className="mt-4 flex h-28 items-end gap-2 sm:h-32">{[38,54,43,72,60,88,68].map((h,i)=><div key={i} className="flex flex-1 flex-col justify-end gap-1"><div className={`rounded-t-md ${i === 5 ? 'bg-blue-600' : 'bg-blue-100'}`} style={{height:`${h}%`}}/><span className="text-center text-[8px] font-semibold text-slate-400">{['M','T','W','T','F','S','S'][i]}</span></div>)}</div></div>
            <div className="rounded-xl border border-slate-100 p-3 sm:p-4"><p className="text-xs font-extrabold text-slate-800">Top products</p><div className="mt-3 space-y-3">{[['Premium Rice','₹8,420'],['Cooking Oil','₹6,180'],['Tea Pack','₹4,860']].map(([name,total])=><div key={name} className="flex items-center justify-between gap-2"><div className="min-w-0"><p className="truncate text-[10px] font-bold text-slate-700">{name}</p><div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-4/5 rounded-full bg-blue-500"/></div></div><span className="text-[10px] font-extrabold text-slate-800">{total}</span></div>)}</div></div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2.5"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-blue-600"><Check className="h-4 w-4"/></span><div><p className="text-[10px] font-extrabold text-slate-800">Everything looks healthy</p><p className="text-[9px] font-medium text-slate-500">Sales, stock and payments are up to date.</p></div></div><span className="text-[9px] font-extrabold text-blue-600">View report →</span></div>
        </div>
      </div>
    </div>
  </div>
}

export default function HomePage() {
  return <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
    <section className="relative overflow-hidden bg-[#f8fbff]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_25%,rgba(23,105,255,.12),transparent_30%),radial-gradient(circle_at_8%_60%,rgba(83,170,255,.08),transparent_25%)]" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <nav className="flex h-[76px] items-center justify-between border-b border-slate-200/80">
          <Brand />
          <div className="hidden items-center gap-8 text-[13px] font-bold text-slate-600 lg:flex">
            <a href="#features" className="transition hover:text-blue-600">Features</a>
            <a href="#modules" className="transition hover:text-blue-600">Modules</a>
            <a href="#why" className="transition hover:text-blue-600">Why BIZYBUK</a>
            <a href="#pricing" className="transition hover:text-blue-600">Pricing</a>
            <button className="inline-flex items-center gap-1 transition hover:text-blue-600">Resources <ChevronDown className="h-3.5 w-3.5"/></button>
          </div>
          <div className="flex items-center gap-2.5"><Link href="/login" className="hidden rounded-xl px-3.5 py-2.5 text-[13px] font-bold text-slate-700 hover:bg-white sm:inline-flex">Login</Link><Link href="/signup" className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-extrabold text-white shadow-[0_8px_20px_rgba(23,105,255,.2)] transition hover:bg-blue-700">Start free</Link></div>
        </nav>
        <div className="grid gap-12 pb-16 pt-14 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-blue-700 shadow-sm"><Zap className="h-3.5 w-3.5 fill-current"/> Built for growing businesses</div>
            <h1 className="mt-6 max-w-2xl text-[46px] font-extrabold leading-[1.04] tracking-[-.055em] text-[#102447] sm:text-6xl lg:text-[68px]">Run your business.<br/><span className="text-blue-600">We handle the rest.</span></h1>
            <p className="mt-6 max-w-xl text-[16px] leading-7 text-slate-600 sm:text-[17px]">One professional workspace for billing, inventory, customers, payments and daily operations — designed to help your business move faster.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white shadow-[0_12px_25px_rgba(23,105,255,.2)] transition hover:-translate-y-0.5 hover:bg-blue-700">Create your shop <ArrowRight className="h-4 w-4"/></Link><Link href="/customer-signup" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">Customer portal</Link></div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-bold text-slate-500"><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600"/>Easy to use</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600"/>Role based</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600"/>Mobile ready</span><span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-blue-600"/>Secure</span></div>
          </div>
          <DashboardPreview />
        </div>
      </div>
    </section>

    <section className="border-y border-slate-100 bg-white"><div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0"><div className="flex items-center gap-3 px-5 py-6 sm:px-7"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ShieldCheck className="h-5 w-5"/></span><div><p className="text-xs font-extrabold">Secure & reliable</p><p className="mt-0.5 text-[10px] text-slate-500">Built for business</p></div></div><div className="flex items-center gap-3 px-5 py-6 sm:px-7"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Zap className="h-5 w-5"/></span><div><p className="text-xs font-extrabold">Fast workflows</p><p className="mt-0.5 text-[10px] text-slate-500">Less admin work</p></div></div><div className="flex items-center gap-3 px-5 py-6 sm:px-7"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UsersRound className="h-5 w-5"/></span><div><p className="text-xs font-extrabold">Made for teams</p><p className="mt-0.5 text-[10px] text-slate-500">Role-based access</p></div></div><div className="flex items-center gap-3 px-5 py-6 sm:px-7"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BarChart3 className="h-5 w-5"/></span><div><p className="text-xs font-extrabold">Clear insights</p><p className="mt-0.5 text-[10px] text-slate-500">Know your numbers</p></div></div></div></section>

    <section id="features" className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">Everything connected</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] text-[#102447] sm:text-5xl">One workspace. Every part of your business.</h2><p className="mt-4 text-[15px] leading-7 text-slate-600">Replace scattered tools with a simple system that keeps sales, stock, customers and accounts connected.</p></div><div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title} className="bg-white p-7 transition hover:bg-[#fbfdff]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5"/></span><h3 className="mt-5 text-[16px] font-extrabold text-slate-900">{title}</h3><p className="mt-2 text-[13px] leading-6 text-slate-500">{text}</p><div className="mt-5 flex items-center gap-1 text-[11px] font-extrabold text-blue-600">Learn more <ArrowRight className="h-3.5 w-3.5"/></div></article>)}</div></div></section>

    <section id="modules" className="bg-[#f7faff] px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-center"><div><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">Powerful, without the clutter</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] text-[#102447] sm:text-5xl">Everything your shop needs to grow.</h2><p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600">Start simple and add capabilities as you grow. Every module works together, so your team always works from the same information.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#102447] px-5 py-3 text-[13px] font-extrabold text-white transition hover:bg-slate-800">Explore BIZYBUK <ArrowRight className="h-4 w-4"/></Link></div><div className="grid gap-3 sm:grid-cols-2">{modules.map((module,i)=><div key={module} className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-blue-50 group-hover:text-blue-600"><Check className="h-4 w-4"/></span><span className="text-[13px] font-bold text-slate-800">{module}</span></div><span className="text-[10px] font-extrabold text-slate-300">{String(i + 1).padStart(2,'0')}</span></div>)}</div></div></section>

    <section id="why" className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-28"><div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3"><div className="rounded-3xl bg-[#102447] p-8 text-white lg:col-span-2 lg:p-10"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><Store className="h-5 w-5"/></div><p className="mt-7 text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-200">Built for real businesses</p><h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Professional tools without enterprise complexity.</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">BIZYBUK keeps the interface focused on the work your team does every day — sell, buy, stock, collect, review and grow.</p><div className="mt-7 grid gap-3 sm:grid-cols-3"><span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-200">Clear workflows</span><span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-200">Connected data</span><span className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-200">Ready to scale</span></div></div><div className="rounded-3xl border border-slate-200 bg-[#f8fbff] p-8 lg:p-10"><ShieldCheck className="h-7 w-7 text-blue-600"/><h3 className="mt-6 text-2xl font-extrabold text-[#102447]">Control at every level.</h3><p className="mt-3 text-sm leading-7 text-slate-600">Give admins, staff and customers the right experience with role-based access and purpose-built workflows.</p><div className="mt-7 space-y-3 text-xs font-bold text-slate-700"><p className="flex gap-2"><Check className="h-4 w-4 text-emerald-600"/>Role-based permissions</p><p className="flex gap-2"><Check className="h-4 w-4 text-emerald-600"/>Mobile-friendly workspace</p><p className="flex gap-2"><Check className="h-4 w-4 text-emerald-600"/>Secure business data</p></div></div></div></section>

    <section id="pricing" className="border-t border-slate-100 bg-[#f7faff] px-5 py-16 text-center sm:px-8 lg:px-10"><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">Ready when you are</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#102447] sm:text-4xl">Start running your business better.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">Set up your workspace, invite your team and start with the tools you need today.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Start free <ArrowRight className="h-4 w-4"/></Link></section>

    <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><Brand/><p className="text-xs font-semibold text-slate-400">Business, simplified. Built for growth.</p><div className="flex gap-5 text-xs font-bold text-slate-500"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></div></div></footer>
  </main>
}
