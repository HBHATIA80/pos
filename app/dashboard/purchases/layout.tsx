import reference from '../transaction-voucher-reference.module.css'
import typography from './purchase-typography.module.css'

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${reference.transactionRoot} ${typography.purchaseTypography}`}>{children}</div>
}
