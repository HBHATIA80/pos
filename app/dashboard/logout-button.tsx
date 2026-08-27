'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function logout() {
    if (loading) return
    setLoading(true)
    try {
      await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => undefined)
      await supabase.auth.signOut({ scope: 'local' })
      router.replace('/login')
      router.refresh()
    } catch {
      // Local sign-out should still complete even if the lock-release request fails.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      title="Sign out securely"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {loading ? 'Signing out…' : 'Logout'}
    </button>
  )
}
