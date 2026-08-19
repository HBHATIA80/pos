import Link from 'next/link'
import { Smartphone } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <Link href="/" className="mx-auto mb-8 inline-flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Smartphone className="h-5 w-5 text-white" />
          </span>
          <span className="text-2xl font-bold text-slate-900">
            Partronix<span className="text-blue-600">.in</span>
          </span>
        </Link>
        {children}
      </div>
    </main>
  )
}
