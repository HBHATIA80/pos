import reference from '../transaction-voucher-reference.module.css'

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return <div className={reference.transactionRoot}>{children}</div>
}
