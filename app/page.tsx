import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, Check, ChevronDown, CreditCard, PackageCheck, ShieldCheck, ShoppingCart, Store, UsersRound, Zap } from 'lucide-react'

const features = [
  { icon: ShoppingCart, title: 'Point of sale', text: 'Fast billing for busy counters, with a workflow your team can learn quickly.' },
  { icon: Boxes, title: 'Inventory control', text: 'Track products, stock movement and low-stock items without spreadsheets.' },
  { icon: PackageCheck, title: 'Purchasing', text: 'Keep supplier purchases organized and stock replenishment simple.' },
  { icon: CreditCard, title: 'Payments & accounts', text: 'Connect receipts, expenses, parties and balances in one workspace.' },
  { icon: BarChart3, title: 'Business insights', text: 'See sales, performance and trends clearly so you can act with confidence.' },
  { icon: UsersRound, title: 'Customer portal', text: 'Give customers a simple, branded way to browse, order and stay updated.' },
]

const modules = ['Sales & POS', 'Products', 'Inventory', 'Categories', 'Purchases', 'Parties', 'Payments', 'Receipts', 'Expenses', 'Ledgers', 'Orders', 'Customer portal']

function Brand() {
  return <Link href="/" className="brand-lockup" aria-label="BIZYBUK.IN home"><span className="brand-mark">B</span><span className="brand-wordmark">BIZYBUK<span>.IN</span></span></Link>
}

function ShopOwnerIllustration() {
  return <div className="relative mx-auto w-full max-w-[520px] lg:max-w-[570px]">
    <div className="absolute inset-8 rounded-[42px] bg-blue-100/70 blur-3xl" />
    <div className="relative overflow-hidden rounded-[34px] border border-blue-100 bg-gradient-to-br from-[#eef6ff] via-white to-[#edf8ff] p-3 shadow-[0_28px_80px_rgba(36,91,170,.15)]">
      <svg viewBox="0 0 640 510" className="h-auto w-full" role="img" aria-label="Friendly cartoon shop owner running a growing business">
        <rect x="12" y="12" width="616" height="486" rx="32" fill="#f8fbff"/>
        <circle cx="530" cy="88" r="54" fill="#e9f4ff"/><circle cx="560" cy="58" r="18" fill="#d8ecff"/>
        <path d="M82 128h292v242H82z" fill="#fff" stroke="#d7e6f5" strokeWidth="5"/>
        <path d="M82 128h292l-22-56H104z" fill="#1769ff"/>
        <path d="M108 78l14 48M164 78l14 48M220 78l14 48M276 78l14 48M332 78l14 48" stroke="#fff" strokeWidth="14"/>
        <path d="M82 128h292" stroke="#c9dced" strokeWidth="5"/>
        <rect x="108" y="164" width="72" height="64" rx="11" fill="#edf5ff"/><rect x="193" y="164" width="72" height="64" rx="11" fill="#effaf6"/><rect x="278" y="164" width="72" height="64" rx="11" fill="#fff7e8"/>
        <circle cx="144" cy="192" r="17" fill="#5ca7ff"/><path d="M125 216h38" stroke="#1769ff" strokeWidth="7" strokeLinecap="round"/>
        <circle cx="229" cy="192" r="17" fill="#36b982"/><path d="M210 216h38" stroke="#13976a" strokeWidth="7" strokeLinecap="round"/>
        <circle cx="314" cy="192" r="17" fill="#ffb020"/><path d="M297 216h34" stroke="#d88900" strokeWidth="7" strokeLinecap="round"/>
        <rect x="108" y="250" width="242" height="91" rx="14" fill="#f8fbff"/>
        <path d="M128 314l35-22 32 12 35-31 34 16 37-28 38 16" fill="none" stroke="#1769ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M398 116l40-36 34 15 58-62" fill="none" stroke="#42bf83" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/><path d="M520 33l15-2-3 16" fill="none" stroke="#42bf83" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="464" cy="192" r="64" fill="#ffd9b8"/>
        <path d="M412 183c1-55 89-79 110-11-29-12-65-9-110 11z" fill="#26354d"/>
        <circle cx="442" cy="195" r="7" fill="#17253d"/><circle cx="485" cy="195" r="7" fill="#17253d"/>
        <path d="M445 222c12 10 25 10 37 0" fill="none" stroke="#17253d" strokeWidth="5" strokeLinecap="round"/>
        <path d="M405 265c26-28 92-28 120 0l-9 130H410z" fill="#1769ff"/>
        <path d="M431 275l-28 118M499 275l28 118" stroke="#0e51c9" strokeWidth="14" strokeLinecap="round"/>
        <rect x="439" y="306" width="51" height="70" rx="9" fill="#1b2e4f"/><rect x="447" y="316" width="35" height="42" rx="5" fill="#eaf3ff"/>
        <path d="M520 245c32-21 61-1 55 23-5 22-31 29-48 11" fill="#ffd9b8"/><path d="M531 246c23-21 46-7 50 10" fill="none" stroke="#1769ff" strokeWidth="9" strokeLinecap="round"/>
        <rect x="387" y="410" width="194" height="60" rx="18" fill="#fff" stroke="#d8e6f5" strokeWidth="3"/>
        <text x="407" y="433" fill="#6c809a" fontSize="12" fontWeight="700">BUSINESS GROWTH</text><text x="407" y="457" fill="#112442" fontSize="22" fontWeight="800">+18.6%</text>
        <path d="M500 450l13-13 12 8 22-29" fill="none" stroke="#22a86f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="94" cy="416" r="27" fill="#e9f4ff"/><path d="M80 416l10 10 19-24" fill="none" stroke="#1769ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="133" y="413" fill="#112442" fontSize="17" fontWeight="800">Happy shop. Better control.</text><text x="133" y="436" fill="#647991" fontSize="12" fontWeight="600">Sales, stock and customers in one place.</text>
      </svg>
    </div>
  </div>
}

function DashboardPreview() {
  return <div className="relative mx-auto w-full max-w-[690px]">
    <div className="absolute -inset-5 rounded-[36px] bg-blue-100/60 blur-3xl" />
    <div className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_25px_70px_rgba(25,55,100,.14)]">
      <div className="flex h-11 items-center justify-between border-b border-slate-100 px-4"><div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-200"/><i className="h-2.5 w-2.5 rounded-full bg-slate-200"/><i className="h-2.5 w-2.5 rounded-full bg-slate-200"/></div><span className="rounded-md bg-slate-50 px-2.5 py-1 text-[9px] font-bold text-slate-500">BIZYBUK.IN · BUSINESS</span></div>
      <div className="grid grid-cols-[55px_1fr] sm:grid-cols-[64px_1fr]">
        <aside className="border-r border-slate-100 bg-slate-50 p-2.5"><div className="mb-5 flex h-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">B</div>{[Store, ShoppingCart, Boxes, UsersRound, BarChart3].map((Icon,i)=><div key={i} className={`mb-2 flex h-8 items-center justify-center rounded-lg ${i===0?'bg-blue-50 text-blue-600':'text-slate-400'}`}><Icon className="h-4 w-4"/></div>)}</aside>
        <div className="min-w-0 p-4 sm:p-5"><div className="flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">Business command centre</p><h3 className="mt-1 text-base font-extrabold text-slate-900 sm:text-lg">Good morning, Admin</h3></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-extrabold text-emerald-700">LIVE</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['₹42,850','Sales','+12.8%'],['38','Orders','+8.4%'],['1,284','Products','Active'],['12','Low stock','Attention']].map(([v,l,m],i)=><div key={l} className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5"><p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">{l}</p><p className="mt-1 text-sm font-extrabold text-slate-900 sm:text-base">{v}</p><p className={`mt-0.5 text-[8px] font-bold ${i===3?'text-amber-600':'text-emerald-600'}`}>{m}</p></div>)}</div>
          <div className="mt-3 rounded-xl border border-slate-100 p-3"><div className="flex justify-between"><p className="text-[10px] font-extrabold">Today at a glance</p><span className="text-[8px] font-bold text-slate-400">Sales · stock · payments</span></div><div className="mt-3 flex h-28 items-end gap-2">{[42,58,50,74,63,88,69].map((h,i)=><div key={i} className="flex flex-1 flex-col justify-end gap-1"><div className={`rounded-t-md ${i===5?'bg-blue-600':'bg-blue-100'}`} style={{height:`${h}%`}}/><span className="text-center text-[8px] font-semibold text-slate-400">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span></div>)}</div></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-blue-50 p-3"><p className="text-[9px] font-extrabold text-slate-800">Everything looks healthy</p><p className="mt-1 text-[8px] text-slate-500">Your key business activity is up to date.</p></div><div className="rounded-xl border border-slate-100 p-3"><p className="text-[9px] font-extrabold text-slate-800">Top product</p><p className="mt-1 text-[10px] font-extrabold text-blue-600">Premium Rice · ₹8,420</p></div></div>
        </div>
      </div>
    </div>
  </div>
}

export default function HomePage() {
  return <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
    <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#f8fbff] to-[#eef6ff]">
      <div className="absolute -left-24 top-36 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl"/><div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl"/>
      <div className="relative mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
        <nav className="flex h-[78px] items-center justify-between border-b border-slate-200/80"><Brand/><div className="hidden items-center gap-8 text-[13px] font-bold text-slate-600 lg:flex"><a href="#features" className="hover:text-blue-600">Features</a><a href="#modules" className="hover:text-blue-600">Modules</a><a href="#why" className="hover:text-blue-600">Why BIZYBUK</a><a href="#pricing" className="hover:text-blue-600">Pricing</a><button className="inline-flex items-center gap-1 hover:text-blue-600">Resources <ChevronDown className="h-3.5 w-3.5"/></button></div><div className="flex items-center gap-2"><Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-white sm:inline-flex">Login</Link><Link href="/signup" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Start free</Link></div></nav>
        <div className="grid gap-8 pb-14 pt-10 lg:grid-cols-[.82fr_1.18fr] lg:items-center lg:gap-4 lg:pb-16 lg:pt-12">
          <div className="relative z-10"><div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[.13em] text-blue-700 shadow-sm"><Zap className="h-3.5 w-3.5 fill-current"/> Fast · Secure · Smart</div><h1 className="mt-5 max-w-xl text-[48px] font-extrabold leading-[1.01] tracking-[-.055em] text-[#102447] sm:text-6xl lg:text-[64px]">Run your business.<br/><span className="text-blue-600">We handle the rest.</span></h1><p className="mt-5 max-w-lg text-[16px] leading-7 text-slate-600">Manage sales, inventory, customers, payments and daily operations — all in one simple workspace built for growing businesses.</p><div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700">Create your shop <ArrowRight className="h-4 w-4"/></Link><Link href="/customer-signup" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50">Customer portal</Link></div><div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-slate-500"><span>✓ No clutter</span><span>✓ Desktop ready</span><span>✓ Mobile friendly</span><span>✓ Role based access</span></div></div>
          <div className="relative"><ShopOwnerIllustration/></div>
        </div>
        <div className="pb-12 lg:-mt-2"><DashboardPreview/></div>
      </div>
    </section>

    <section className="border-y border-slate-100 bg-white"><div className="mx-auto grid max-w-[1380px] grid-cols-2 sm:grid-cols-4"><div className="flex items-center gap-3 border-b border-r border-slate-100 px-5 py-5 sm:border-b-0 sm:px-8"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ShieldCheck className="h-5 w-5"/></span><div><p className="text-xs font-extrabold">Secure & reliable</p><p className="text-[10px] text-slate-500">Built for business</p></div></div><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5 sm:border-b-0 sm:border-r sm:px-8"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Zap className="h-5 w-5"/></span><div><p className="text-xs font-extrabold">Fast workflows</p><p className="text-[10px] text-slate-500">Less admin work</p></div></div><div className="flex items-center gap-3 border-r border-slate-100 px-5 py-5 sm:px-8"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UsersRound className="h-5 w-5"/></span><div><p className="text-xs font-extrabold">Made for teams</p><p className="text-[10px] text-slate-500">Role-based access</p></div></div><div className="flex items-center gap-3 px-5 py-5 sm:px-8"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BarChart3 className="h-5 w-5"/></span><div><p className="text-xs font-extrabold">Clear insights</p><p className="text-[10px] text-slate-500">Know your numbers</p></div></div></div></section>

    <section id="features" className="bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto max-w-[1380px]"><div className="max-w-2xl"><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">Everything connected</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] text-[#102447] sm:text-5xl">One workspace. Every part of your business.</h2><p className="mt-4 text-[15px] leading-7 text-slate-600">A clean, practical system for the work that keeps your shop moving.</p></div><div className="mt-10 grid overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title} className="bg-white p-7 hover:bg-[#fbfdff]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-5 w-5"/></span><h3 className="mt-5 text-base font-extrabold">{title}</h3><p className="mt-2 text-[13px] leading-6 text-slate-500">{text}</p></article>)}</div></div></section>

    <section id="modules" className="bg-[#f7faff] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[.72fr_1.28fr] lg:items-center"><div><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">All the tools you need</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] text-[#102447] sm:text-5xl">Powerful without the clutter.</h2><p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600">Start with the basics and use more modules as your business grows.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#102447] px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800">Start with BIZYBUK <ArrowRight className="h-4 w-4"/></Link></div><div className="grid gap-3 sm:grid-cols-2">{modules.map(m=><div key={m} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600"><Check className="h-4 w-4"/></span><span className="text-sm font-bold text-slate-800">{m}</span></div>)}</div></div></section>

    <section id="why" className="bg-white px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto max-w-[1380px] rounded-[32px] bg-gradient-to-br from-[#eff6ff] to-white p-8 sm:p-12 lg:p-16"><div className="max-w-3xl"><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">Built around your day</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-.035em] text-[#102447] sm:text-5xl">Less time managing software. More time running the business.</h2><p className="mt-5 text-[15px] leading-7 text-slate-600">BIZYBUK keeps the everyday flow connected: sell, buy, stock, collect, pay, review and grow — without making the interface complicated.</p></div></div></section>

    <section id="pricing" className="bg-[#f7faff] px-5 py-20 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:flex-row lg:items-center"><div><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">Ready when you are</p><h2 className="mt-2 text-3xl font-extrabold text-[#102447]">Give your business a better workspace.</h2><p className="mt-2 text-sm text-slate-500">Create your shop and start organizing your business today.</p></div><Link href="/signup" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Start free <ArrowRight className="h-4 w-4"/></Link></div></section>

    <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1380px] flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><Brand/><p className="text-xs font-semibold text-slate-500">Business. Simplified. Success Amplified.</p><div className="flex gap-5 text-xs font-bold text-slate-500"><span>Privacy</span><span>Terms</span><span>Support</span></div></div></footer>
  </main>
}
