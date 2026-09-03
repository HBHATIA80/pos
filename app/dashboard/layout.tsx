import { redirect } from 'next/navigation'
import '@/app/dashboard/transaction-pages-reference.css'
import '@/app/dashboard/mobile-app.css'
import { createClient } from '@/lib/supabase/server'
import POSShell from './pos-shell'
import CustomerCatalogGuard from './customer-catalog-guard'
import InvoiceViewer from './invoice-viewer'
import BulkDeletePanel from './bulk-delete-panel'
import InvoiceDateSelector from './invoice-date-selector'
import PosKeyboardShortcuts from './pos-keyboard-shortcuts'

type Props = { children: React.ReactNode }

export default async function DashboardLayout({ children }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, role, business_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) redirect('/login')

  const { data: business } = profile.business_id
    ? await supabase
        .from('businesses')
        .select('name, logo_url')
        .eq('id', profile.business_id)
        .maybeSingle()
    : { data: null }

  const { data: superAdminAccess } = await supabase
    .from('platform_super_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const canViewInvoices = profile.role === 'admin' || profile.role === 'staff'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Shared Bill Summary: light-yellow BIZBook theme for Sales + Purchases. */
        aside section {
          border-radius: 1rem !important;
          border: 1px solid #ead9a6 !important;
          background: #ffffff !important;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08) !important;
          overflow: hidden !important;
        }

        aside section > div:first-child {
          background: #fff8dc !important;
          color: #000000 !important;
          min-height: 78px !important;
          padding: 12px 14px !important;
          border-bottom: 1px solid #ead9a6 !important;
        }
        aside section > div:first-child,
        aside section > div:first-child * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        aside section > div:first-child div:nth-child(2) {
          color: #000000 !important;
          font-size: 1.25rem !important;
          line-height: 1.5rem !important;
          font-weight: 900 !important;
          letter-spacing: -0.02em !important;
          margin-top: 2px !important;
        }
        aside section > div:nth-child(2) {
          display: block !important;
          background: #ffffff !important;
          color: #000000 !important;
          padding: 12px 14px !important;
        }
        aside section > div:nth-child(2),
        aside section > div:nth-child(2) * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        aside section > div:nth-child(2) > div:last-child {
          border: 1px solid #ead9a6 !important;
          border-radius: 12px !important;
          background: #fff8dc !important;
          color: #000000 !important;
          padding: 12px !important;
        }
        aside section > div:nth-child(2) > div:last-child * {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        aside section > div:nth-child(2) > div:last-child span:last-child,
        aside section > div:nth-child(2) > div:last-child b:last-child {
          color: #000000 !important;
          font-weight: 900 !important;
          font-size: 1.25rem !important;
          line-height: 1.5rem !important;
        }
        aside section > div:last-child {
          background: #ffffff !important;
          border-top: 1px solid #f3e8bf !important;
          padding: 10px !important;
        }
        aside section > div:last-child button {
          font-weight: 900 !important;
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        aside section > div:last-child button:not(:disabled) {
          background: #dff5e7 !important;
          border-color: #9ed7b1 !important;
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        aside section > div:last-child button:not(:disabled):hover {
          background: #ccebd8 !important;
          border-color: #7fc796 !important;
        }
        aside section > div:last-child button:disabled {
          background: #f1f1f1 !important;
          border-color: #d6d6d6 !important;
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        aside section [class*="text-white"],
        aside section [class*="text-slate"],
        aside section [class*="text-emerald"] {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
        }
        @media (max-width: 1279px) {
          aside section > div:first-child { min-height: 70px !important; }
        }
      ` }} />
      <CustomerCatalogGuard role={profile.role} />
      <POSShell
        profile={{ fullName: profile.full_name, role: profile.role, phone: profile.phone }}
        businessName={business?.name ?? 'My Shop'}
        logoUrl={business?.logo_url ?? null}
        isSuperAdmin={Boolean(superAdminAccess)}
      >
        <InvoiceDateSelector />
        {children}
      </POSShell>
      <InvoiceViewer enabled={canViewInvoices} />
      <BulkDeletePanel />
      <PosKeyboardShortcuts />
    </>
  )
}