import Link from 'next/link'
import { ArrowRight, BarChart3, Boxes, Check, CreditCard, PackageCheck, ShieldCheck, ShoppingCart, Store, UsersRound, Zap } from 'lucide-react'

const features = [
  { icon: ShoppingCart, title: 'Fast billing', text: 'Quick, clear POS workflows built for everyday counter work.' },
  { icon: Boxes, title: 'Smart inventory', text: 'Know what is in stock, what is moving and what needs attention.' },
  { icon: PackageCheck, title: 'Purchasing', text: 'Track supplier purchases and keep your stock flowing cleanly.' },
  { icon: CreditCard, title: 'Accounts & ledgers', text: 'Payments, receipts, expenses and party balances stay connected.' },
  { icon: BarChart3, title: 'Business insights', text: 'Understand sales and performance without drowning in reports.' },
  { icon: UsersRound, title: 'Customer portal', text: 'Give customers a simple branded way to browse and order.' },
]

const modules = ['Sales & POS','Products','Inventory','Categories','Purchases','Parties','Payments','Receipts','Expenses','Ledgers','Orders','Customer portal']

function ShopIllustration() {
  return <div className="relative mx-auto w-full max-w-[620px] overflow-hidden rounded-[32px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-4 shadow-[0_24px_70px_rgba(23,105,255,.12)]">
    <svg viewBox="0 0 640 500" className="h-auto w-full" role="img" aria-label="Friendly cartoon shop owner managing a growing store">
      <defs><linearGradient id="wall" x1="0" x2="1"><stop offset="0" stopColor="#eef6ff"/><stop offset="1" stopColor="#ffffff"/></linearGradient><linearGradient id="shirt" x1="0" x2="1"><stop offset="0" stopColor="#1769ff"/><stop offset="1" stopColor="#54a3ff"/></linearGradient></defs>
      <rect x="18" y="18" width="604" height="464" rx="28" fill="url(#wall)"/>
      <rect x="58" y="92" width="300" height="250" rx="20" fill="#ffffff" stroke="#dbe8f7" strokeWidth="4"/>
      <path d="M58 138h300" stroke="#dbe8f7" strokeWidth="4"/>
      <path d="M58 102h300l-22 46H80z" fill="#1769ff" opacity=".96"/>
      <path d="M82 103l12 35M142 103l12 35M202 103l12 35M262 103l12 35M322 103l12 35" stroke="#ffffff" strokeWidth="12" opacity=".9"/>
      <rect x="90" y="168" width="78" height="70" rx="10" fill="#eaf2ff"/><rect x="180" y="168" width="78" height="70" rx="10" fill="#f2fbf7"/><rect x="270" y="168" width="60" height="70" rx="10" fill="#fff7e6"/>
      <circle cx="129" cy="202" r="20" fill="#54a3ff"/><rect x="108" y="220" width="42" height="7" rx="3.5" fill="#1769ff"/>
      <circle cx="219" cy="202" r="20" fill="#39b981"/><rect x="198" y="220" width="42" height="7" rx="3.5" fill="#0f9f6e"/>
      <circle cx="300" cy="202" r="20" fill="#ffb020"/><rect x="284" y="220" width="32" height="7" rx="3.5" fill="#d97706"/>
      <rect x="92" y="262" width="236" height="58" rx="12" fill="#f8fbff"/><path d="M112 294l34-14 26 10 31-20 32 12 38-22 31 10" fill="none" stroke="#1769ff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="455" cy="168" r="66" fill="#ffd9b8"/>
      <path d="M405 162c4-54 94-73 108-6-24-10-55-11-108 6z" fill="#26354d"/>
      <circle cx="433" cy="173" r="7" fill="#18253d"/><circle cx="477" cy="173" r="7" fill="#18253d"/><path d="M439 200c12 10 25 10 38 0" fill="none" stroke="#18253d" strokeWidth="5" strokeLinecap="round"/>
      <path d="M392 248c23-26 96-26 119 0l-7 118H399z" fill="url(#shirt)"/>
      <path d="M410 264l-22 100M493 264l26 100" stroke="#0f4dcc" strokeWidth="14" strokeLinecap="round"/>
      <rect x="426" y="291" width="52" height="70" rx="9" fill="#1b2e4f"/><rect x="434" y="300" width="36" height="42" rx="5" fill="#eaf2ff"/>
      <path d="M523 229c42-22 68 9 45 36-17 20-44 3-45-20" fill="#ffd9b8"/>
      <path d="M545 232c26-22 55-4 56 17" fill="none" stroke="#1769ff" strokeWidth="10" strokeLinecap="round"/>
      <rect x="392" y="374" width="182" height="58" rx="18" fill="#ffffff" stroke="#dbe8f7" strokeWidth="3"/>
      <text x="412" y="397" fill="#6b7f99" fontSize="13" fontWeight="700">BUSINESS GROWTH</text><text x="412" y="420" fill="#0f1f3d" fontSize="22" fontWeight="800">+18.6%</text><path d="M502 414l14-14 11 8 20-27" fill="none" stroke="#0f9f6e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="98" cy="402" r="28" fill="#eaf2ff"/><path d="M84 404l10 10 20-25" fill="none" stroke="#1769ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="140" y="402" fill="#0f1f3d" fontSize="18" fontWeight="800">Happy shop. Better control.</text><text x="140" y="426" fill="#64748b" fontSize="13" fontWeight="600">Sales, stock and customers in one place.</text>
    </svg>
  </div>
}

export default function HomePage() {
  return <main className="min-h-screen overflow-x-hidden bg-[#f6f9ff] text-slate-950">
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f7fbff] to-[#eef5ff]">
      <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl"/><div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl"/>
      <div className="relative mx-auto max-w-7xl px-5 py-5 sm:px-8 lg:px-10">
        <nav className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <Link href="/" className="brand-lockup"><span className="brand-mark">B</span><span className="brand-wordmark">BIZYBUK<span>.IN</span></span></Link>
          <div className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex"><a href="#features" className="hover:text-blue-600">Features</a><a href="#modules" className="hover:text-blue-600">Modules</a><a href="#about" className="hover:text-blue-600">Why BIZYBUK</a></div>
          <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50">Login</Link><Link href="/signup" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Start free</Link></div>
        </nav>
        <div className="grid gap-12 pb-16 pt-14 lg:grid-cols-[.92fr_1.08fr] lg:items-center lg:pb-20 lg:pt-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-blue-700"><Zap className="h-3.5 w-3.5"/> Fast · Secure · Smart</div>
            <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.02] tracking-[-.045em] sm:text-6xl lg:text-7xl">Run your business.<br/><span className="text-blue-600">Grow with confidence.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">BIZYBUK.IN brings billing, inventory, purchasing, customers, payments, ledgers and business insights into one simple workspace.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-extrabold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700">Create your shop <ArrowRight className="h-4 w-4"/></Link><Link href="/customer-signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 font-bold text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50">Customer portal</Link></div>
            <div className="mt-8 grid grid-cols-2 gap-3 text-xs font-bold text-slate-600 sm:grid-cols-4"><span>✓ Easy to use</span><span>✓ Role based</span><span>✓ Mobile ready</span><span>✓ Built for shops</span></div>
          </div>
          <ShopIllustration/>
        </div>
      </div>
    </section>
    <section id="features" className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto max-w-7xl"><p className="text-sm font-extrabold uppercase tracking-[.18em] text-blue-600">Everything connected</p><h2 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">One clean workspace for the whole business.</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">A friendly interface for real shop counters, laptops, tablets and customer phones — with less noise and more room for work.</p><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({icon:Icon,title,text})=><article key={title} className="rounded-3xl border border-slate-200 bg-[#f8fbff] p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5"/></span><h3 className="mt-5 text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></div></section>
    <section id="modules" className="bg-[#f6f9ff] px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-sm font-extrabold uppercase tracking-[.18em] text-blue-600">One platform</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">Everything your shop needs.</h2><p className="mt-4 max-w-xl leading-7 text-slate-600">Start with billing and inventory, then expand into accounting, customer ordering and analytics as your business grows.</p><Link href="/signup" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800">Try BIZYBUK.IN <ArrowRight className="h-4 w-4"/></Link></div><div className="grid gap-3 sm:grid-cols-2">{modules.map(module=><div key={module} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Check className="h-4 w-4"/></span><span className="text-sm font-bold text-slate-800">{module}</span></div>)}</div></div></section>
    <section id="about" className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-24"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3"><article className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-7 text-white md:col-span-2"><Store className="h-7 w-7 text-blue-100"/><h2 className="mt-5 text-2xl font-extrabold text-white">Powering everyday businesses.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">BIZYBUK.IN follows the natural rhythm of a business: sell, buy, stock, collect, pay, review and grow.</p></article><article className="rounded-3xl border border-slate-200 bg-[#f8fbff] p-7"><ShieldCheck className="h-7 w-7 text-blue-600"/><h2 className="mt-5 text-2xl font-extrabold">Built with control.</h2><p className="mt-2 text-sm leading-6 text-slate-600">Role-based access keeps admin, staff and customers focused on exactly what they need.</p></article></div></section>
    <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><Link href="/" className="brand-lockup"><span className="brand-mark">B</span><span className="brand-wordmark">BIZYBUK<span>.IN</span></span></Link><p className="text-xs font-semibold text-slate-500">Business. Simplified. Success Amplified.</p></div></footer>
  </main>
}
