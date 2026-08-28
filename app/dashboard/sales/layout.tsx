import styles from './sales.module.css'

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.salesVisual}>{children}</div>
}
