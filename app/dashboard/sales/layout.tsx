import styles from './sales.module.css'
import reference from '../transaction-voucher-reference.module.css'

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.salesVisual} ${reference.transactionRoot}`}>{children}</div>
}
