import Link from 'next/link'
import { ArrowRight, ShieldCheck, Smartphone, Store, UserRound } from 'lucide-react'

const foundations = [
  { icon: Store, title: 'Shop-ready architecture', text: 'The system is organized around a shop, users, catalog, parties and transactions so the POS can grow without redesigning the foundation.' },
  { icon: ShieldCheck, title: 'Separate roles', text: 'Shop signup creates an admin. Customer signup joins an existing shop as a portal user and cannot create an admin account.' },
  { icon: Smartphone, title: 'Mobile + desktop', text: 'Responsive layouts and touch-friendly controls keep the same POS usable on phones, tablets and desktop screens.' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">Partronix.in POS</span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">A practical POS for shops and their customers.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Run products, parties, sales, payments and ledgers from the shop workspace while customers get a separate portal for shopping and their own account ledger.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Login <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"><Store className="h-4 w-4" /> Create Shop Account</Link>
            <Link href="/customer-signup" className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 hover:bg-blue-100 sm:col-span-2"><UserRound className="h-4 w-4" /> Create Customer Account</Link>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {foundations.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><Icon className="h-7 w-7 text-blue-600" /><h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
        </div>
      </section>
    </main>
  )
}
