import Link from 'next/link'
import {
  ArrowRight, BarChart3, Check, ChevronDown, Headphones, Package,
  ShieldCheck, ShoppingCart, Smile, TrendingUp, Users, Zap,
} from 'lucide-react'

function Brand() {
  return (
    <Link href="/" aria-label="BIZYBUK.IN home" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-black text-white shadow-lg shadow-blue-600/20">B</span>
      <span className="text-[22px] font-black tracking-[-.045em] text-[#102447] sm:text-[24px]">BIZYBUK<span className="text-blue-600">.IN</span></span>
    </Link>
  )
}

const modules = [
  { title: 'Sales', text: 'Quotes, orders & invoices', icon: ShoppingCart },
  { title: 'Purchases', text: 'Bills, vendors & expenses', icon: TrendingUp },
  { title: 'Inventory', text: 'Live stock & low-stock alerts', icon: Package },
  { title: 'Customers', text: 'Profiles, history & follow-ups', icon: Users },
  { title: 'Reports', text: 'Clear insights for decisions', icon: BarChart3 },
  { title: 'Payments', text: 'Receivables, dues & tracking', icon: ShieldCheck },
]

const stats = [
  ['₹12.45L', 'Total sales', ShoppingCart],
  ['1,245', 'Orders', TrendingUp],
  ['856', 'Customers', Users],
  ['₹2.34L', 'Outstanding', BarChart3],
] as const

function DashboardPreview() {
  const bars = [42, 58, 48, 72, 64, 90, 76]
  return (
    <div className="relative w-full max-w-[590px]">
      <div className="absolute -inset-10 rounded-[60px] bg-blue-100/70 blur-3xl" />
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(25,66,120,.16)]">
        <div className="flex h-12 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /></div>
          <span className="text-[10px] font-bold tracking-[.12em] text-slate-400">BIZYBUK DASHBOARD</span>
        </div>
        <div className="grid grid-cols-[56px_1fr]">
          <aside className="border-r border-slate-100 bg-slate-50/80 p-2.5">
            <div className="mb-6 flex h-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">B</div>
            {[ShoppingCart, Package, Users, BarChart3, ShieldCheck].map((Icon, i) => <div key={i} className={`mb-2 flex h-9 items-center justify-center rounded-xl ${i === 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><Icon className="h-4.5 w-4.5" /></div>)}
          </aside>
          <div className="min-w-0 p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Overview</p><h3 className="mt-1 text-[20px] font-extrabold text-[#102447]">Business command centre</h3></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-700">LIVE</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map(([value, label, Icon], i) => <div key={label} className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><div className="mt-2 flex items-center justify-between"><Icon className={`h-4.5 w-4.5 ${i === 3 ? 'text-orange-500' : 'text-blue-600'}`} /><span className="text-[9px] font-bold text-emerald-600">+{i + 8}.2%</span></div><p className="mt-1.5 text-[16px] font-black text-slate-900">{value}</p></div>)}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center justify-between"><div><p className="text-[13px] font-extrabold text-slate-800">Sales overview</p><p className="mt-0.5 text-[10px] text-slate-500">Performance across the last 7 days</p></div><button className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-bold text-slate-600">This week</button></div>
              <div className="mt-4 flex h-[105px] items-end gap-2.5">{bars.map((h, i) => <div key={i} className="flex h-full flex-1 flex-col justify-end"><div className={`rounded-t-lg ${i === 5 ? 'bg-blue-600' : 'bg-blue-100'}`} style={{ height: `${h}%` }} /><span className="mt-2 text-center text-[8px] font-semibold text-slate-400">{['M','T','W','T','F','S','S'][i]}</span></div>)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrustStrip() {
  const items = [
    { icon: '🇮🇳', title: 'Made in India', text: 'Built for Indian businesses' },
    { icon: Smile, title: 'Easy to use', text: 'Simple, fast & efficient' },
    { icon: Headphones, title: '24×7 support', text: 'Help when you need it' },
    { icon: ShieldCheck, title: 'Secure & safe', text: 'Your data stays protected' },
  ] as const
  return <section className="border-y border-slate-100 bg-white"><div className="mx-auto grid max-w-[1240px] grid-cols-2 lg:grid-cols-4">{items.map(({ icon, title, text }, i) => { const Icon = typeof icon === 'string' ? null : icon; return <div key={title} className={`flex items-center gap-3 px-5 py-5 sm:px-8 lg:py-6 ${i < 2 ? 'border-b border-slate-100 lg:border-b-0' : ''} ${i % 2 === 0 ? 'lg:border-r' : ''} ${i === 2 ? 'lg:border-r' : ''}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">{typeof icon === 'string' ? icon : Icon && <Icon className="h-5.5 w-5.5" />}</span><div><p className="text-[13px] font-extrabold text-[#172b4d]">{title}</p><p className="mt-0.5 text-[11px] text-slate-500">{text}</p></div></div> })}</div></section>
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#fbfdff] to-[#eef6ff]">
        <div className="pointer-events-none absolute -left-40 top-56 h-[420px] w-[420px] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 -top-24 h-[620px] w-[620px] rounded-full bg-sky-100/60 blur-3xl" />
        <div className="relative mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
          <nav className="flex min-h-[82px] items-center justify-between border-b border-slate-100">
            <Brand />
            <div className="hidden items-center gap-8 text-[14px] font-bold text-[#19304f] lg:flex"><a href="#features" className="transition hover:text-blue-600">Features</a><a href="#modules" className="transition hover:text-blue-600">Modules</a><a href="#why" className="transition hover:text-blue-600">Why BIZYBUK</a><a href="#pricing" className="transition hover:text-blue-600">Pricing</a><button className="inline-flex items-center gap-1 transition hover:text-blue-600">Resources <ChevronDown className="h-4 w-4" /></button></div>
            <div className="flex items-center gap-2.5 sm:gap-3"><Link href="/login" className="hidden rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[14px] font-bold text-blue-600 shadow-sm sm:inline-flex">Login</Link><Link href="/signup" className="rounded-xl bg-blue-600 px-5 py-2.5 text-[13px] font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 sm:px-6 sm:text-[14px]">Start free</Link></div>
          </nav>

          <div className="grid items-center gap-10 py-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-14 lg:py-20">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-blue-600 shadow-sm"><Zap className="h-3.5 w-3.5 fill-current" /> Fast · Secure · Smart</div>
              <h1 className="mt-7 max-w-[650px] text-[44px] font-black leading-[1.04] tracking-[-.055em] text-[#102447] sm:text-[56px] lg:text-[62px]">Run your business.<br /><span className="text-blue-600">We handle the rest.</span></h1>
              <p className="mt-6 max-w-[570px] text-[17px] leading-7 text-[#536b89] sm:text-[18px]">Manage sales, inventory, customers, payments and daily operations — all in one simple workspace built for growing businesses.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link href="/signup" className="inline-flex h-14 items-center gap-3 rounded-xl bg-blue-600 px-7 text-[15px] font-extrabold text-white shadow-xl shadow-blue-600/20 transition hover:bg-blue-700">Create your shop <ArrowRight className="h-5 w-5" /></Link><Link href="/customer-signup" className="inline-flex h-14 items-center rounded-xl border border-slate-200 bg-white px-7 text-[15px] font-bold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50">Customer portal</Link></div>
              <div className="mt-8 grid max-w-[520px] grid-cols-2 gap-3 text-[12px] font-bold text-slate-600 sm:grid-cols-4">{['No clutter','Desktop ready','Mobile friendly','Role based'].map(item => <span key={item} className="flex items-center gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50"><Check className="h-3.5 w-3.5 text-blue-600" /></span>{item}</span>)}</div>
            </div>
            <div className="relative flex justify-center lg:justify-end"><DashboardPreview /></div>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section id="features" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5 text-center sm:px-8"><p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-blue-600">Everything in one place</p><h2 className="mt-3 text-[34px] font-black leading-tight tracking-[-.045em] text-[#122747] sm:text-[42px]">Built around the way your business works.</h2><p className="mx-auto mt-4 max-w-2xl text-[16px] leading-7 text-slate-500">One clear workspace replaces scattered spreadsheets, messages and manual follow-ups.</p></div>
      </section>

      <section id="modules" className="bg-[#f7faff] py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8"><div className="text-center"><p className="text-[12px] font-extrabold uppercase tracking-[.2em] text-blue-600">Modules</p><h2 className="mt-3 text-[34px] font-black leading-tight tracking-[-.045em] text-[#122747] sm:text-[42px]">One workspace. Every important business task.</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(({ title, text, icon: Icon }) => <Link href="#" key={title} className="group flex min-h-[132px] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"><Icon className="h-5.5 w-5.5" /></span><span className="min-w-0"><span className="block text-[16px] font-extrabold text-[#172b4d]">{title}</span><span className="mt-1 block text-[13px] leading-5 text-slate-500">{text}</span></span><ArrowRight className="ml-auto h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600" /></Link>)}</div></div>
      </section>

      <section id="why" className="bg-white py-20 sm:py-24"><div className="mx-auto max-w-[1180px] px-5 sm:px-8"><div className="flex flex-col gap-7 rounded-[28px] bg-[#102447] p-7 text-white shadow-xl sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:p-12"><div><p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-blue-300">Less admin. More control.</p><h2 className="mt-2 text-[32px] font-black tracking-[-.04em] sm:text-[40px]">See the whole business clearly.</h2><p className="mt-3 max-w-2xl text-[15px] leading-7 text-blue-100">From sales and stock to customers and payments, keep the important numbers and actions in one place.</p></div><Link href="#features" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-[14px] font-extrabold text-white transition hover:bg-white/15">Explore features <ArrowRight className="h-4 w-4" /></Link></div></div></section>

      <footer className="border-t border-slate-100 bg-white"><div className="mx-auto flex min-h-[76px] max-w-[1240px] flex-col items-center justify-between gap-3 px-5 py-5 text-[12px] text-slate-500 sm:flex-row sm:px-8 lg:px-10"><span>© 2025 BIZYBUK.IN All rights reserved.</span><div className="flex items-center gap-4 sm:gap-5"><Link href="/privacy" className="font-semibold text-blue-600 hover:underline">Privacy Policy</Link><span className="h-4 w-px bg-slate-200" /><Link href="/terms" className="font-semibold text-blue-600 hover:underline">Terms &amp; Conditions</Link><span className="h-4 w-px bg-slate-200" /><Link href="/support" className="font-semibold text-blue-600 hover:underline">Support</Link></div></div></footer>
    </main>
  )
}
