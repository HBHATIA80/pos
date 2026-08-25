import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import POSShell from './pos-shell'
import CustomerCatalogGuard from './customer-catalog-guard'
import InvoiceViewer from './invoice-viewer'

type Props = {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, role, business_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    redirect('/login')
  }

  const { data: business } = profile.business_id
    ? await supabase
        .from('businesses')
        .select('name')
        .eq('id', profile.business_id)
        .maybeSingle()
    : { data: null }

  const canViewInvoices = profile.role === 'admin' || profile.role === 'staff'

  return (
    <>
      <CustomerCatalogGuard role={profile.role} />
      <POSShell
        profile={{
          fullName: profile.full_name,
          role: profile.role,
          phone: profile.phone,
        }}
        businessName={business?.name ?? 'My Shop'}
      >
        {children}
      </POSShell>
      <InvoiceViewer enabled={canViewInvoices} />
    </>
  )
}
