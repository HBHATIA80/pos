'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'

const INACTIVITY_MS = 10 * 60 * 1000
const HEARTBEAT_MS = 60 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'] as const

export default function SessionGuard() {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const lastActivityRef = useRef(Date.now())
  const lastHeartbeatRef = useRef(0)
  const signingOutRef = useRef(false)

  useEffect(() => {
    let mounted = true

    const signOutAndRedirect = async (message: string) => {
      if (signingOutRef.current) return
      signingOutRef.current = true

      // Release only this application's active lock before removing the local
      // auth session. This cannot affect a newer login on another device.
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => undefined)

      await supabaseRef.current.auth.signOut({ scope: 'local' }).catch(() => undefined)
      if (!mounted) return
      toast.error(message, { duration: 5000 })
      router.replace('/login?error=session_timeout')
      router.refresh()
    }

    const markActivity = () => {
      const now = Date.now()
      if (now - lastActivityRef.current >= INACTIVITY_MS) {
        void signOutAndRedirect('You were signed out after 10 minutes of inactivity.')
        return
      }
      lastActivityRef.current = now
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, markActivity, { passive: true }))

    const timer = window.setInterval(async () => {
      const now = Date.now()
      if (now - lastActivityRef.current >= INACTIVITY_MS) {
        await signOutAndRedirect('You were signed out after 10 minutes of inactivity.')
        return
      }

      if (now - lastHeartbeatRef.current < HEARTBEAT_MS) return
      lastHeartbeatRef.current = now

      try {
        const response = await fetch('/api/auth/session', {
          method: 'PATCH',
          credentials: 'include',
          cache: 'no-store',
        })

        if (!response.ok) {
          await signOutAndRedirect(
            response.status === 409
              ? 'This account is now active on another device.'
              : 'Your secure session has expired. Please sign in again.',
          )
        }
      } catch {
        // Do not log users out for a transient network failure.
      }
    }, 15_000)

    return () => {
      mounted = false
      window.clearInterval(timer)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, markActivity))
    }
  }, [router])

  return null
}
