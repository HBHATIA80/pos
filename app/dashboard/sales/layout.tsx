import styles from './sales.module.css'
import reference from '../transaction-voucher-reference.module.css'
import voucherModal from '../latest-voucher-modal.module.css'
import LatestVoucherScreen from '../LatestVoucherScreen'

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.salesVisual} ${reference.transactionRoot} ${voucherModal.voucherModalScope}`}>{children}<LatestVoucherScreen /></div>
}
