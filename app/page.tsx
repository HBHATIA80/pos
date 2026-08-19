import { Store, ShieldCheck, Smartphone } from 'lucide-react'

const foundations = [
  {
    icon: Store,
    title: 'Shop-ready architecture',
    text: 'The system is organized around a shop, its users, catalog, parties and transactions so later phases can grow without redesigning the foundation.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by default',
    text: 'Supabase Auth, row-level security and server-side session handling are prepared for the authentication and permissions phases.',
  },
  {
    icon: Smartphone,
    title: 'Mobile + desktop',
    text: 'The UI foundation uses responsive layouts and touch-friendly controls so the same POS can work on phones, tablets and desktop screens.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
            Phase 1 · Foundation
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
            A practical POS foundation built to grow.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            No GST or tax in the MVP. Mobile-number + password authentication, shop roles,
            catalog, parties, invoices, payments, expenses, ledger and analysis will be added
            phase by phase without breaking the database design.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {foundations.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <Icon className="h-7 w-7 text-blue-600" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Next: run the Phase 1 database migration, then Phase 2 will build phone + password authentication.
        </p>
      </section>
    </main>
  )
}
