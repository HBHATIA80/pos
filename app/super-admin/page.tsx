import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SuperAdminConsole from './super-admin-console'
import HomepageImageSettings from './homepage-image-settings'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: access } = await supabase
    .from('platform_super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!access) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <SuperAdminConsole />
      <HomepageImageSettings />
    </div>
  )
}
