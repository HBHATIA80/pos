import Link from 'next/link'
import { ArrowRight, BarChart3, Check, ChevronDown, Headphones, Package, ShieldCheck, ShoppingCart, Smile, TrendingUp, Users, Zap } from 'lucide-react'

function Brand() {
  return (
    <Link href="/" aria-label="BIZYBUK.IN home" className="flex items-center gap-3">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-[11px] border-[3px] border-blue-600 bg-white text-[18px] font-black text-blue-600 shadow-sm">
        <ShoppingCart className="absolute h-6 w-6" strokeWidth={2.8} />
        <span className="relative z-10 mt-0.5 text-[15px] font-black text-white">B</span>
      </span>
      <span className="text-[23px] font-black tracking-[-0.055em] text-[#14294a]">
        BIZYBUK<span className="text-blue-600">.IN</span>
      </span>
    </Link>
  )
}

const stats = [
  ['₹42,850', 'SALES', ShoppingCart],
  ['38', 'ORDERS', TrendingUp],
  ['1,284', 'PRODUCTS', Package],
  ['12', 'LOW STOCK', Package],
] as const

function DashboardPreview() {
  const bars = [46, 61, 52, 78, 65, 91, 72]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="relative w-full max-w-[480px]">
      <div className="absolute -inset-8 rounded-[45px] bg-blue-100/65 blur-3xl" />
      <div className="relative overflow-hidden rounded-[18px] border border-[#dfe8f3] bg-white shadow-[0_20px_55px_rgba(38,82,139,.14)]">
        <div className="flex h-[44px] items-center justify-between border-b border-slate-100 px-4">
          <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /></div>
          <span className="rounded-full bg-slate-50 px-3 py-1 text-[8px] font-extrabold tracking-[.08em] text-slate-400">BIZYBUK.IN</span>
        </div>
        <div className="grid grid-cols-[48px_1fr]">
          <aside className="border-r border-slate-100 bg-[#f8fafc] px-2 py-3">
            <div className="mb-5 flex h-8 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-black text-white">B</div>
            {[ShoppingCart, Package, Users, BarChart3, ShieldCheck].map((Icon, i) => (
              <div key={i} className={`mb-2 flex h-8 items-center justify-center rounded-lg ${i === 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-300'}`}><Icon className="h-4 w-4" /></div>
            ))}
          </aside>
          <div className="min-w-0 p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-[8px] font-bold uppercase tracking-[.15em] text-slate-400">BIZYBUK.IN</p><h3 className="mt-1 text-[17px] font-extrabold text-[#132847]">Business command centre</h3></div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-extrabold text-emerald-600">LIVE</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {stats.map(([value, label, Icon], i) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-white px-2.5 py-3 shadow-[0_3px_12px_rgba(20,50,90,.04)]">
                  <p className="text-[7px] font-bold text-slate-400">{label}</p>
                  <Icon className={`mt-2 h-4 w-4 ${i === 1 ? 'text-emerald-500' : i === 2 ? 'text-violet-500' : i === 3 ? 'text-orange-500' : 'text-blue-600'}`} />
                  <p className="mt-1 text-[14px] font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-slate-100 p-3">
              <div className="flex items-start justify-between"><div><p className="text-[12px] font-extrabold text-slate-800">Today at a glance</p><p className="mt-1 text-[8px] font-medium text-slate-400">Sales · stock · payments · receivables</p></div><BarChart3 className="h-5 w-5 text-blue-600" /></div>
              <div className="mt-3 flex h-[96px] items-end gap-2">
                {bars.map((height, i) => <div key={days[i]} className="flex h-full flex-1 flex-col justify-end"><div className={`rounded-t-md ${i === 5 ? 'bg-blue-600' : 'bg-blue-100'}`} style={{ height: `${height}%` }} /><span className="mt-2 text-center text-[7px] font-semibold text-slate-400">{days[i]}</span></div>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TrustStrip() {
  const items = [
    { icon: '🇮🇳', title: 'Made in India', text: 'For Indian Businesses' },
    { icon: Smile, title: 'Easy to Use', text: 'Simple. Fast. Efficient.' },
    { icon: Headphones, title: '24x7 Support', text: 'We are here for you' },
    { icon: ShieldCheck, title: 'Secure & Safe', text: 'Your data is always protected' },
  ] as const

  return (
    <section className="border-y border-slate-100 bg-white">
      <div className="mx-auto grid max-w-[1380px] grid-cols-2 sm:grid-cols-4">
        {items.map(({ icon, title, text }, i) => {
          const Icon = typeof icon === 'string' ? null : icon
          return <div key={title} className={`flex min-h-[104px] items-center gap-4 px-6 lg:px-10 ${i < 3 ? 'border-b border-slate-100 sm:border-b-0 sm:border-r' : ''}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f2f6fc] text-xl text-blue-600">{typeof icon === 'string' ? icon : Icon ? <Icon className="h-6 w-6" /> : null}</span>
            <div><p className="text-[12px] font-extrabold text-[#172b4d]">{title}</p><p className="mt-1 text-[10px] font-medium text-slate-500">{text}</p></div>
          </div>
        })}
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#fbfdff] to-[#eef7ff]">
        <div className="pointer-events-none absolute -left-28 top-44 h-[430px] w-[430px] rounded-full bg-blue-100/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-36 -top-28 h-[600px] w-[600px] rounded-full bg-sky-100/55 blur-3xl" />
        <div className="relative mx-auto max-w-[1380px] px-6 lg:px-12">
          <nav className="flex h-[96px] items-center justify-between border-b border-slate-100">
            <Brand />
            <div className="hidden items-center gap-10 text-[14px] font-bold text-[#172b4d] lg:flex">
              <a href="#features" className="hover:text-blue-600">Features</a>
              <a href="#modules" className="hover:text-blue-600">Modules</a>
              <a href="#why" className="hover:text-blue-600">Why BIZYBUK</a>
              <a href="#pricing" className="hover:text-blue-600">Pricing</a>
              <button className="inline-flex items-center gap-1 hover:text-blue-600">Resources <ChevronDown className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden rounded-xl border border-slate-200 bg-white px-6 py-3 text-[14px] font-bold text-blue-600 shadow-sm sm:inline-flex">Login</Link>
              <Link href="/signup" className="rounded-xl bg-blue-600 px-7 py-3 text-[14px] font-extrabold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Start free</Link>
            </div>
          </nav>

          <div className="grid min-h-[635px] items-center gap-3 py-10 lg:grid-cols-[1.04fr_.9fr_1.12fr] lg:py-8">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f3f7fd] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-blue-600"><Zap className="h-4 w-4 fill-current" /> Fast · Secure · Smart</div>
              <h1 className="mt-7 max-w-[620px] text-[52px] font-black leading-[1.03] tracking-[-.055em] text-[#102447] sm:text-[58px] xl:text-[62px]">Run your business.<br /><span className="text-blue-600">We handle the rest.</span></h1>
              <p className="mt-6 max-w-[520px] text-[17px] leading-7 text-slate-600">Manage sales, inventory, customers, payments and daily operations — all in one simple workspace built for growing businesses.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="inline-flex h-[54px] items-center gap-3 rounded-xl bg-blue-600 px-7 text-[15px] font-extrabold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700">Create your shop <ArrowRight className="h-5 w-5" /></Link>
                <Link href="/customer-signup" className="inline-flex h-[54px] items-center rounded-xl border border-slate-200 bg-white px-7 text-[15px] font-bold text-slate-800 shadow-sm hover:border-blue-200 hover:bg-blue-50">Customer portal</Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[11px] font-bold text-slate-500">
                {['No clutter', 'Desktop ready', 'Mobile friendly', 'Role based access'].map(item => <span key={item} className="inline-flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50"><Check className="h-3.5 w-3.5 text-blue-600" /></span>{item}</span>)}
              </div>
            </div>

            <div className="relative flex h-[500px] items-end justify-center self-end">
              <div className="pointer-events-none absolute bottom-12 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-100/70 blur-3xl" />
              <img src="/api/landing-assets/shop-owner" alt="BIZYBUK shop owner" className="relative z-10 h-full w-auto max-w-full object-contain" />
            </div>

            <div className="relative z-10 flex justify-center lg:justify-end">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-[1180px] px-6 text-center"><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">Everything in one place</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em] text-[#122747]">Built around the way your business works.</h2></div>
      </section>
      <section id="modules" className="bg-[#f7faff] py-20"><div className="mx-auto max-w-[1180px] px-6 text-center"><p className="text-[11px] font-extrabold uppercase tracking-[.18em] text-blue-600">Modules</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em] text-[#122747]">One workspace. Every important business task.</h2></div></section>
      <section id="why" className="bg-white py-20"><div className="mx-auto max-w-[1180px] px-6"><div className="rounded-[28px] bg-[#102447] p-12 text-white"><h2 className="text-4xl font-black">Less admin. More control.</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-blue-100">A clearer view of your business, from sales and stock to customers and payments.</p></div></div></section>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex min-h-[64px] max-w-[1380px] items-center justify-between px-6 text-[12px] text-slate-500 lg:px-12">
          <span>© 2025 BIZYBUK.IN All rights reserved.</span>
          <div className="hidden items-center gap-5 sm:flex"><Link href="/privacy" className="font-medium text-blue-600">Privacy Policy</Link><span className="h-4 w-px bg-slate-200" /><Link href="/terms" className="font-medium text-blue-600">Terms &amp; Conditions</Link><span className="h-4 w-px bg-slate-200" /><Link href="/support" className="font-medium text-blue-600">Support</Link></div>
        </div>
      </footer>
    </main>
  )
}
