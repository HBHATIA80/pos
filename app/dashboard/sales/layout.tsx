import styles from './sales.module.css'
import matchStyles from './sales-purchase-match.module.css'
import reference from '../transaction-voucher-reference.module.css'
import voucherModal from '../latest-voucher-modal.module.css'
import mobile from '../mobile-voucher.module.css'
import mobileFinal from '../mobile-voucher-final.module.css'
import mobileMatch from './sales-mobile-match.module.css'
import LatestVoucherScreen from '../LatestVoucherScreen'

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.salesVisual} ${matchStyles.match} ${reference.transactionRoot} ${voucherModal.voucherModalScope} ${mobile.mobileVoucher} ${mobileFinal.mobileVoucherFinal} ${mobileMatch.salesMobileMatch}`}>{children}<LatestVoucherScreen /></div>
}
