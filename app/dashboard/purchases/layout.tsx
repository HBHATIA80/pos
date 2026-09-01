import reference from '../transaction-voucher-reference.module.css'
import typography from './purchase-typography.module.css'
import voucherModal from '../latest-voucher-modal.module.css'
import mobile from '../mobile-voucher.module.css'
import LatestVoucherScreen from '../LatestVoucherScreen'

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${reference.transactionRoot} ${typography.purchaseTypography} ${voucherModal.voucherModalScope} ${mobile.mobileVoucher}`}>{children}<LatestVoucherScreen /></div>
}
