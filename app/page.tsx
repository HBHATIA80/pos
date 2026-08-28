import Link from 'next/link'
import { ArrowRight, BarChart3, Check, ChevronDown, CreditCard, FileText, Headphones, Package, Receipt, ShieldCheck, ShoppingCart, Smile, TrendingUp, Users, Wallet, Zap } from 'lucide-react'

const GREEN = '#18795c'

function Brand() {
  return (
    <Link href="/" aria-label="BIZYBUK.IN home" className="flex items-center gap-3">
      <span className="relative flex h-10 w-10 items-center justify-center rounded-[11px] border-[3px] border-[#18795c] bg-white text-[18px] font-black text-[#18795c] shadow-sm">
        <ShoppingCart className="absolute h-6 w-6" strokeWidth={2.8} />
        <span className="relative z-10 mt-0.5 text-[15px] font-black text-white">B</span>
      </span>
      <span className="text-[23px] font-black tracking-[-.055em] text-[#17382f]">
        BIZYBUK<span className="text-[#18795c]">.IN</span>
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

const features = [
  { icon: ShoppingCart, title: 'Sales & POS', text: 'Create invoices quickly, collect payments and keep every sale organised.' },
  { icon: Package, title: 'Inventory', text: 'Know your stock, purchases and low-stock items without spreadsheets.' },
  { icon: Users, title: 'Parties & Customers', text: 'Keep customer and supplier balances, contacts and activity together.' },
  { icon: BarChart3, title: 'Business Reports', text: 'See sales, purchases, expenses, profit and cash position clearly.' },
]

const modules = [
  { icon: Receipt, title: 'Invoices & vouchers', text: 'Sales invoices, purchase invoices, receipts and payment vouchers.' },
  { icon: Wallet, title: 'Accounts & expenses', text: 'Track money in, money out and operating expenses in one place.' },
  { icon: CreditCard, title: 'Payments', text: 'Record collections and supplier payments with a clear audit trail.' },
  { icon: FileText, title: 'Filtered records', text: 'Find transactions by date, amount, party, type and other useful filters.' },
]

function DashboardPreview() {
  const bars = [46, 61, 52, 78, 65, 91, 72]
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="relative w-full max-w-[480px]">
      <div className="absolute -inset-8 rounded-[45px] bg-[#ccebdd]/70 blur-3xl" />
      <div className="relative overflow-hidden rounded-[20px] border border-[#d9e9e1] bg-white shadow-[0_24px_65px_rgba(23,67,52,.14)]">
        <div className="flex h-[44px] items-center justify-between border-b border-[#edf3ef] px-4">
          <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /><i className="h-2.5 w-2.5 rounded-full bg-slate-200" /></div>
          <span className="rounded-full bg-[#f1f8f4] px-3 py-1 text-[8px] font-extrabold tracking-[.08em] text-[#4f7468]">BIZYBUK.IN</span>
        </div>
        <div className="grid grid-cols-[48px_1fr]">
          <aside className="border-r border-[#edf3ef] bg-[#f7fbf9] px-2 py-3">
            <div className="mb-5 flex h-8 items-center justify-center rounded-lg bg-[#18795c] text-[11px] font-black text-white">B</div>
            {[ShoppingCart, Package, Users, BarChart3, ShieldCheck].map((Icon, i) => (
              <div key={i} className={`mb-2 flex h-8 items-center justify-center rounded-lg ${i === 0 ? 'bg-[#e3f3eb] text-[#18795c]' : 'text-[#9bb5ab]'}`}><Icon className="h-4 w-4" /></div>
            ))}
          </aside>
          <div className="min-w-0 p-4">
            <div className="flex items-start justify-between">
              <div><p className="text-[8px] font-bold uppercase tracking-[.15em] text-slate-400">BIZYBUK.IN</p><h3 className="mt-1 text-[17px] font-extrabold text-[#17382f]">Business command centre</h3></div>
              <span className="rounded-full bg-[#e7f6ee] px-2.5 py-1 text-[8px] font-extrabold text-[#18795c]">LIVE</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {stats.map(([value, label, Icon], i) => (
                <div key={label} className="rounded-xl border border-[#e8f0ec] bg-white px-2.5 py-3 shadow-[0_3px_12px_rgba(20,60,45,.04)]">
                  <p className="text-[7px] font-bold text-slate-400">{label}</p>
                  <Icon className={`mt-2 h-4 w-4 ${i === 1 ? 'text-[#2f9b70]' : i === 2 ? 'text-[#4c8b76]' : i === 3 ? 'text-[#9a8b45]' : 'text-[#18795c]'}`} />
                  <p className="mt-1 text-[14px] font-black text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-[#e8f0ec] p-3">
              <div className="flex items-start justify-between"><div><p className="text-[12px] font-extrabold text-slate-800">Today at a glance</p><p className="mt-1 text-[8px] font-medium text-slate-400">Sales · stock · payments · receivables</p></div><BarChart3 className="h-5 w-5 text-[#18795c]" /></div>
              <div className="mt-3 flex h-[96px] items-end gap-2">
                {bars.map((height, i) => <div key={days[i]} className="flex h-full flex-1 flex-col justify-end"><div className={`rounded-t-md ${i === 5 ? 'bg-[#18795c]' : 'bg-[#d9eee4]'}`} style={{ height: `${height}%` }} /><span className="mt-2 text-center text-[7px] font-semibold text-slate-400">{days[i]}</span></div>)}
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
    <section className="border-y border-[#e6efe9] bg-white">
      <div className="mx-auto grid max-w-[1380px] grid-cols-2 sm:grid-cols-4">
        {items.map(({ icon, title, text }, i) => {
          const Icon = typeof icon === 'string' ? null : icon
          return <div key={title} className={`flex min-h-[104px] items-center gap-4 px-6 lg:px-10 ${i < 3 ? 'border-b border-[#e6efe9] sm:border-b-0 sm:border-r' : ''}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf7f2] text-xl text-[#18795c]">{typeof icon === 'string' ? icon : Icon ? <Icon className="h-6 w-6" /> : null}</span>
            <div><p className="text-[13px] font-extrabold text-[#17382f]">{title}</p><p className="mt-1 text-[11px] font-medium text-slate-500">{text}</p></div>
          </div>
        })}
      </div>
    </section>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#17251f]">
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-[#fbfefc] to-[#eef8f3]">
        <div className="pointer-events-none absolute -left-28 top-44 h-[430px] w-[430px] rounded-full bg-[#dff3e8]/75 blur-3xl" />
        <div className="pointer-events-none absolute -right-36 -top-28 h-[600px] w-[600px] rounded-full bg-[#e5f5ee] blur-3xl" />
        <div className="relative mx-auto max-w-[1380px] px-5 sm:px-6 lg:px-12">
          <nav className="flex min-h-[82px] items-center justify-between border-b border-[#e7efe9]" aria-label="Main navigation">
            <Brand />
            <div className="hidden items-center gap-9 text-[14px] font-bold text-[#29483e] lg:flex">
              <a href="#features" className="transition-colors hover:text-[#18795c]">Features</a>
              <a href="#modules" className="transition-colors hover:text-[#18795c]">Modules</a>
              <a href="#why" className="transition-colors hover:text-[#18795c]">Why BIZYBUK</a>
              <a href="#pricing" className="transition-colors hover:text-[#18795c]">Pricing</a>
              <button className="inline-flex items-center gap-1 transition-colors hover:text-[#18795c]">Resources <ChevronDown className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-4">
              <Link href="/login" className="hidden rounded-xl border border-[#d7e6de] bg-white px-5 py-3 text-[14px] font-bold text-[#18795c] shadow-sm transition hover:border-[#b7d7c8] hover:bg-[#f5fbf8] sm:inline-flex">Login</Link>
              <Link href="/signup" className="inline-flex min-h-[46px] items-center rounded-xl bg-[#18795c] px-5 sm:px-7 text-[14px] font-extrabold text-white shadow-[0_8px_22px_rgba(24,121,92,.22)] transition hover:bg-[#126149] focus:outline-none focus:ring-4 focus:ring-[#bfe4d2]">Start free</Link>
            </div>
          </nav>

          <div className="grid min-h-[635px] items-center gap-10 py-12 lg:grid-cols-[1.04fr_.9fr_1.12fr] lg:gap-3 lg:py-8">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8ece2] bg-[#f0f9f4] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[.15em] text-[#18795c]"><Zap className="h-4 w-4 fill-current" /> Fast · Secure · Smart</div>
              <h1 className="mt-7 max-w-[620px] text-[44px] font-black leading-[1.04] tracking-[-.055em] text-[#17382f] sm:text-[54px] xl:text-[62px]">Run your business.<br /><span className="text-[#18795c]">We handle the rest.</span></h1>
              <p className="mt-6 max-w-[540px] text-[17px] leading-7 text-[#536b62]">Manage sales, inventory, customers, payments and daily operations — all in one simple workspace built for growing businesses.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/signup" className="inline-flex min-h-[54px] items-center gap-3 rounded-xl bg-[#18795c] px-6 sm:px-7 text-[15px] font-extrabold text-white shadow-[0_12px_28px_rgba(24,121,92,.22)] transition hover:bg-[#126149] focus:outline-none focus:ring-4 focus:ring-[#bfe4d2]">Create your shop <ArrowRight className="h-5 w-5" /></Link>
                <Link href="/customer-signup" className="inline-flex min-h-[54px] items-center rounded-xl border border-[#d8e6df] bg-white px-6 sm:px-7 text-[15px] font-bold text-[#29483e] shadow-sm transition hover:border-[#b8d8c8] hover:bg-[#f4faf7]">Customer portal</Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[12px] font-bold text-[#61776e]">
                {['No clutter', 'Desktop ready', 'Mobile friendly', 'Role based access'].map(item => <span key={item} className="inline-flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e2f3ea]"><Check className="h-3.5 w-3.5 text-[#18795c]" /></span>{item}</span>)}
              </div>
            </div>

            <div className="relative flex h-[410px] items-end justify-center self-end lg:h-[500px]">
              <div className="pointer-events-none absolute bottom-12 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#d5efe2] blur-3xl" />
              <img src="/api/landing-assets/shop-owner" alt="BIZYBUK shop owner" className="relative z-10 h-full w-auto max-w-full object-contain" />
            </div>

            <div className="relative z-10 flex justify-center lg:justify-end">
              <DashboardPreview />
            </div>
          </div>
        </div>
      </section>

      <TrustStrip />

      <section id="features" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-[12px] font-extrabold uppercase tracking-[.18em] text-[#18795c]">Everything in one place</p>
            <h2 className="mt-3 text-[34px] font-black leading-tight tracking-[-.04em] text-[#17382f] sm:text-4xl">Built around the way your business works.</h2>
            <p className="mt-4 text-[16px] leading-7 text-[#62766e]">Simple screens, useful information and fewer steps for the work you do every day.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="group rounded-[22px] border border-[#e0ece5] bg-[#fbfdfc] p-6 shadow-[0_8px_25px_rgba(30,72,56,.05)] transition duration-200 hover:-translate-y-1 hover:border-[#c8e2d4] hover:shadow-[0_16px_32px_rgba(30,72,56,.09)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f5ed] text-[#18795c]"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-5 text-[18px] font-extrabold text-[#1d3b32]">{title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#687b73]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="bg-[#f5faf7] py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
          <div className="text-center">
            <p className="text-[12px] font-extrabold uppercase tracking-[.18em] text-[#18795c]">Modules</p>
            <h2 className="mt-3 text-[34px] font-black leading-tight tracking-[-.04em] text-[#17382f] sm:text-4xl">One workspace. Every important business task.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-7 text-[#62766e]">Keep your financial and operational records connected instead of switching between separate tools.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-[22px] border border-[#dceae2] bg-white p-6 shadow-[0_8px_24px_rgba(30,72,56,.05)]">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7f2] text-[#18795c]"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-5 text-[17px] font-extrabold text-[#1d3b32]">{title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#687b73]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-6">
          <div className="relative overflow-hidden rounded-[28px] border border-[#1f6b53] bg-[#174d3e] p-7 shadow-[0_20px_45px_rgba(22,73,57,.16)] sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#3fa67e]/25 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#d8f1e5]">Why BIZYBUK</span>
                <h2 className="mt-5 text-[34px] font-black leading-tight tracking-[-.04em] text-white sm:text-4xl">Less admin. More control.</h2>
                <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[#d6e9e1]">A clearer view of your business, from sales and stock to customers and payments. The interface stays calm, readable and focused on the action you need to take.</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {['Readable at a glance', 'Fast everyday workflows', 'Works on phone and desktop', 'Built for growing teams'].map(item => <div key={item} className="flex items-center gap-2.5 text-[13px] font-bold text-white"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/12"><Check className="h-4 w-4 text-[#9ee1c2]" /></span>{item}</div>)}
                </div>
              </div>
              <div className="rounded-[22px] border border-white/12 bg-white/8 p-6 backdrop-blur-sm">
                <p className="text-[12px] font-extrabold uppercase tracking-[.15em] text-[#a9d8c3]">Designed for daily use</p>
                <p className="mt-3 text-[17px] font-bold leading-7 text-white">Clear hierarchy, strong contrast and touch-friendly controls across the website.</p>
                <Link href="/signup" className="mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-extrabold text-[#174d3e] transition hover:bg-[#eef9f4]">Get started <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t border-[#e8efeB] bg-[#fbfdfc] py-16">
        <div className="mx-auto max-w-[900px] px-5 text-center sm:px-6">
          <p className="text-[12px] font-extrabold uppercase tracking-[.18em] text-[#18795c]">Simple to start</p>
          <h2 className="mt-3 text-[32px] font-black tracking-[-.04em] text-[#17382f]">Start with your business. Grow from there.</h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#687b73]">Create your workspace and bring your everyday business operations into one place.</p>
          <Link href="/signup" className="mt-7 inline-flex min-h-[50px] items-center gap-2 rounded-xl bg-[#18795c] px-6 text-[14px] font-extrabold text-white shadow-[0_10px_24px_rgba(24,121,92,.18)] transition hover:bg-[#126149]">Start free <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-[#e5eee9] bg-white">
        <div className="mx-auto flex min-h-[76px] max-w-[1380px] flex-col justify-center gap-3 px-5 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-12">
          <span>© 2025 BIZYBUK.IN All rights reserved.</span>
          <div className="flex items-center gap-4 sm:gap-5"><Link href="/privacy" className="font-medium text-[#4e7567] hover:text-[#18795c]">Privacy Policy</Link><span className="h-4 w-px bg-slate-200" /><Link href="/terms" className="font-medium text-[#4e7567] hover:text-[#18795c]">Terms &amp; Conditions</Link><span className="h-4 w-px bg-slate-200" /><Link href="/support" className="font-medium text-[#4e7567] hover:text-[#18795c]">Support</Link></div>
        </div>
      </footer>
    </main>
  )
}
