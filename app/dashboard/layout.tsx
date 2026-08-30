import { redirect } from 'next/navigation'
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
        /* Shared Bill Summary: light-green BIZBook theme for Sales + Purchases */
        aside section {
          border-radius: 1rem !important;
          border: 1px solid #b7e4c7 !important;
          background: #ffffff !important;
          box-shadow: 0 10px 28px rgba(22, 101, 52, 0.10) !important;
          overflow: hidden !important;
        }
        /* Light-green summary header replaces the old dark slate/teal header. */
        aside section > div:first-child {
          background: #dcfce7 !important;
          color: #14532d !important;
          min-height: 78px !important;
          padding: 12px 14px !important;
          border-bottom: 1px solid #bbf7d0 !important;
        }
        aside section > div:first-child,
        aside section > div:first-child * {
          color: #14532d !important;
        }
        aside section > div:first-child div:nth-child(2) {
          color: #166534 !important;
          font-size: 1.25rem !important;
          line-height: 1.5rem !important;
          font-weight: 900 !important;
          letter-spacing: -0.02em !important;
          margin-top: 2px !important;
        }
        /* Summary detail area: clean white surface with green accents. */
        aside section > div:nth-child(2) {
          display: block !important;
          background: #ffffff !important;
          color: #0f172a !important;
          padding: 12px 14px !important;
        }
        aside section > div:nth-child(2) span,
        aside section > div:nth-child(2) b {
          color: #0f172a !important;
        }
        /* Final total gets a soft green highlight instead of a dark box. */
        aside section > div:nth-child(2) > div:last-child {
          border: 1px solid #bbf7d0 !important;
          border-radius: 12px !important;
          background: #ecfdf5 !important;
          color: #166534 !important;
          padding: 12px !important;
        }
        aside section > div:nth-child(2) > div:last-child * {
          color: #166534 !important;
        }
        aside section > div:nth-child(2) > div:last-child span:last-child,
        aside section > div:nth-child(2) > div:last-child b:last-child {
          color: #15803d !important;
          font-weight: 900 !important;
          font-size: 1.25rem !important;
          line-height: 1.5rem !important;
        }
        /* Footer/action area stays white; enabled actions use the website green. */
        aside section > div:last-child {
          background: #ffffff !important;
          border-top: 1px solid #dcfce7 !important;
          padding: 10px !important;
        }
        aside section > div:last-child button {
          font-weight: 900 !important;
        }
        aside section > div:last-child button:not(:disabled) {
          background: #2f855a !important;
          border-color: #2f855a !important;
          color: #ffffff !important;
        }
        aside section > div:last-child button:not(:disabled):hover {
          background: #276749 !important;
          border-color: #276749 !important;
        }
        aside section > div:last-child button:disabled {
          background: #e2e8f0 !important;
          border-color: #cbd5e1 !important;
          color: #64748b !important;
        }
        @media (max-width: 1279px) {
          aside section > div:first-child {
            min-height: 70px !important;
          }
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
