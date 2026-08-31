'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ScrollPanel, SplitPane } from '../ui/LayoutPrimitives'
import styles from './purchase-receiving.module.css'

type Item = {
  id: string
  product_id: string
  product_name: string
  sku: string
  unit_name: string
  quantity: number
  unit_price: number
  line_total: number
}

type ReceiptItem = {
  id: string
  purchase_invoice_item_id: string
  expected_quantity: number
  received_quantity: number
  notes?: string | null
}

type Receipt = {
  id: string
  status: 'pending' | 'verified' | 'partial' | 'rejected'
  received_by?: string | null
  received_at?: string | null
  notes?: string | null
  updated_at: string
  items?: ReceiptItem[]
}

type Party = {
  id: string
  name: string
  phone?: string | null
}

type Purchase = {
  id: string
  invoice_no: string
  status: string
  grand_total: number
  purchased_at?: string | null
  created_at: string
  party?: Party | Party[] | null
  items: Item[]
  receipt?: Receipt | Receipt[] | null
}

type CheckRow = {
  expected: number
  received: number
  notes: string
}

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const partyName = (purchase: Purchase) =>
  Array.isArray(purchase.party)
    ? purchase.party[0]?.name || 'Walk-in / Other'
    : purchase.party?.name || 'Walk-in / Other'

const receiptOf = (purchase: Purchase) =>
  Array.isArray(purchase.receipt)
    ? purchase.receipt[0]
    : purchase.receipt

export default function PurchaseReceivingPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selected, setSelected] = useState<Purchase | null>(null)
  const [rows, setRows] = useState<Record<string, CheckRow>>({})
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)

    try {
      const response = await fetch('/api/purchase-receiving', {
        cache: 'no-store',
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to load purchase receiving records'
        )
      }

      const nextPurchases = (result.purchases || []) as Purchase[]

      setPurchases(nextPurchases)

      /*
       * Important:
       * If the currently selected invoice has become verified,
       * remove it from the detail panel.
       */
      if (selected) {
        const stillPending = nextPurchases.find(
          (purchase) =>
            purchase.id === selected.id &&
            receiptOf(purchase)?.status !== 'verified'
        )

        setSelected(stillPending || null)

        if (!stillPending) {
          setRows({})
          setNotes('')
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to load records'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  /*
   * Only invoices which have NOT been physically verified
   * are shown in the working list.
   */
  const pendingPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) => receiptOf(purchase)?.status !== 'verified'
      ),
    [purchases]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      return pendingPurchases
    }

    return pendingPurchases.filter((purchase) =>
      `${purchase.invoice_no} ${partyName(purchase)}`
        .toLowerCase()
        .includes(q)
    )
  }, [pendingPurchases, query])

  const pendingCount = pendingPurchases.length

  function openPurchase(purchase: Purchase) {
    const receipt = receiptOf(purchase)

    const existing = new Map(
      (receipt?.items || []).map((item) => [
        item.purchase_invoice_item_id,
        item,
      ])
    )

    const next: Record<string, CheckRow> = {}

    purchase.items.forEach((item) => {
      const saved = existing.get(item.id)

      next[item.id] = {
        expected: Number(item.quantity),
        received: saved
          ? Number(saved.received_quantity)
          : Number(item.quantity),
        notes: saved?.notes || '',
      }
    })

    setRows(next)
    setNotes(receipt?.notes || '')
    setSelected(purchase)
  }

  function updateReceived(id: string, value: string) {
    const parsed = value === '' ? 0 : Number(value)

    if (!Number.isFinite(parsed) || parsed < 0) {
      return
    }

    setRows((current) => ({
      ...current,
      [id]: {
        ...current[id],
        received: parsed,
      },
    }))
  }

  function setAll(value: number | 'expected') {
    setRows((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, row]) => [
          id,
          {
            ...row,
            received:
              value === 'expected' ? row.expected : value,
          },
        ])
      )
    )
  }

  async function save() {
    if (!selected || saving) {
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/purchase-receiving', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: selected.id,

          items: Object.entries(rows).map(
            ([purchase_invoice_item_id, row]) => ({
              purchase_invoice_item_id,
              received_quantity: row.received,
              notes: row.notes || null,
            })
          ),

          notes: notes || null,
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result.error || 'Unable to save receiving record'
        )
      }

      const verified =
        result.receipt?.status === 'verified'

      toast.success(
        verified
          ? 'Physical receiving verified'
          : 'Receiving record saved'
      )

      /*
       * Once the invoice is fully verified:
       * - close the detail panel
       * - clear form state
       * - reload list
       * - verified invoice disappears from list
       */
      if (verified) {
        setSelected(null)
        setRows({})
        setNotes('')
      }

      await load()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to save receiving record'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`${styles.page} mx-auto w-full max-w-[1296px] space-y-[18px] pb-24`}
    >
      {/* =========================================================
          HEADER / HERO
      ========================================================= */}
      <section className={styles.receivingHero}>
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <span className={styles.receivingHeroIcon}>
              <ClipboardCheck />
            </span>

            <div className={styles.heroText}>
              <h1>Purchase Receiving</h1>

              <p>
                Check the physical goods against every purchase
                voucher and keep a receiving record.
              </p>
            </div>
          </div>

          <div className={styles.heroActions}>
            <span className={styles.pendingBadge}>
              {pendingCount} not verified
            </span>

            <button
              type="button"
              onClick={() => void load()}
              className={styles.refreshButton}
            >
              <RefreshCw />

              <span>Refresh</span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================
          MAIN TWO-COLUMN AREA
      ========================================================= */}
      <SplitPane
        className={`${styles.receivingLayout} grid-cols-[minmax(0,1fr)_540px] gap-4`}
      >
        {/* =======================================================
            PURCHASE LIST
        ======================================================= */}
        <section className={styles.receivingList}>
          <div className={styles.listHeader}>
            <div className={styles.listHeading}>
              <h2>Purchase Vouchers</h2>

              <p>
                Verify quantity received before closing the
                physical check.
              </p>
            </div>

            <div className={styles.searchBox}>
              <Search />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search invoice or supplier"
                aria-label="Search invoice or supplier"
              />
            </div>
          </div>

          <ScrollPanel
            className={`${styles.receivingListBody} max-h-[calc(100vh-300px)]`}
          >
            {loading ? (
              <div className={styles.listMessage}>
                Loading purchase vouchers…
              </div>
            ) : !filtered.length ? (
              <div className={styles.listMessage}>
                No purchase vouchers found.
              </div>
            ) : (
              <div>
                {filtered.map((purchase) => {
                  const receipt = receiptOf(purchase)

                  const isSelected =
                    selected?.id === purchase.id

                  return (
                    <button
                      key={purchase.id}
                      type="button"
                      onClick={() =>
                        openPurchase(purchase)
                      }
                      className={`${styles.receivingRow} ${
                        isSelected
                          ? styles.receivingRowSelected
                          : ''
                      }`}
                    >
                      {/* Status icon */}
                      <span className={styles.rowStatusIcon}>
                        <ShieldAlert />
                      </span>

                      {/* Invoice information */}
                      <span className={styles.rowMain}>
                        <span className={styles.rowTopLine}>
                          <span
                            className={
                              styles.receivingRowInvoice
                            }
                          >
                            {purchase.invoice_no}
                          </span>

                          <span
                            className={
                              styles.notCheckedBadge
                            }
                          >
                            Not checked
                          </span>
                        </span>

                        <span
                          className={
                            styles.receivingRowMeta
                          }
                        >
                          {partyName(purchase)} ·{' '}
                          {new Date(
                            purchase.purchased_at ||
                              purchase.created_at
                          ).toLocaleDateString('en-IN')}
                        </span>
                      </span>

                      {/* Amount / status / arrow */}
                      <span className={styles.rowRight}>
                        <span className={styles.amountBlock}>
                          <span className={styles.amount}>
                            {money(
                              purchase.grand_total
                            )}
                          </span>

                          <span
                            className={
                              styles.rowStatusText
                            }
                          >
                            {receipt?.status ===
                            'partial'
                              ? 'Partial'
                              : 'Not checked'}
                          </span>
                        </span>

                        <ChevronRight
                          className={
                            styles.rowChevron
                          }
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollPanel>
        </section>

        {/* =======================================================
            DETAIL PANEL
        ======================================================= */}
        <section className={styles.receivingDetail}>
          {!selected ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                <PackageCheck />
              </span>

              <h2>Select a purchase voucher</h2>

              <p>
                Check the physical quantity received and
                save the verification record.
              </p>
            </div>
          ) : (
            <div>
              {/* Detail header */}
              <div className={styles.detailHeader}>
                <div>
                  <p className={styles.detailEyebrow}>
                    Physical Receiving
                  </p>

                  <h2>{selected.invoice_no}</h2>

                  <p className={styles.detailMeta}>
                    {partyName(selected)} ·{' '}
                    {money(selected.grand_total)}
                  </p>
                </div>

                <span
                  className={
                    receiptOf(selected)?.status ===
                    'verified'
                      ? styles.verifiedBadge
                      : styles.detailNotVerifiedBadge
                  }
                >
                  {receiptOf(selected)?.status ===
                  'verified'
                    ? 'Verified'
                    : 'Not verified'}
                </span>
              </div>

              <ScrollPanel
                className={styles.receivingDetailBody}
              >
                <div className={styles.detailContent}>
                  {/* Quick actions */}
                  <div
                    className={
                      styles.quickActionContainer
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setAll('expected')
                      }
                      className={
                        styles.secondaryButton
                      }
                    >
                      Set all as received
                    </button>

                    <button
                      type="button"
                      onClick={() => setAll(0)}
                      className={
                        styles.secondaryButton
                      }
                    >
                      Set all to 0
                    </button>
                  </div>

                  {/* Product table */}
                  <div className={styles.productTable}>
                    <div
                      className={
                        styles.productTableHeader
                      }
                    >
                      <span>Product</span>
                      <span>Invoice Qty</span>
                      <span>Received</span>
                    </div>

                    <div>
                      {selected.items.map((item) => {
                        const row =
                          rows[item.id] || {
                            expected: Number(
                              item.quantity
                            ),
                            received: Number(
                              item.quantity
                            ),
                            notes: '',
                          }

                        const mismatch =
                          row.received !== row.expected

                        return (
                          <div
                            key={item.id}
                            className={
                              styles.productRow
                            }
                          >
                            <div
                              className={
                                styles.productInfo
                              }
                            >
                              <p
                                className={
                                  styles.receivingProductName
                                }
                              >
                                {item.product_name}
                              </p>

                              <p
                                className={
                                  styles.productMeta
                                }
                              >
                                {item.sku} ·{' '}
                                {item.unit_name}
                              </p>

                              {mismatch && (
                                <p
                                  className={
                                    styles.difference
                                  }
                                >
                                  Difference:{' '}
                                  {row.received -
                                    row.expected}
                                </p>
                              )}
                            </div>

                            <div
                              className={
                                styles.expectedQuantity
                              }
                            >
                              {row.expected}
                            </div>

                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.received}
                              onChange={(event) =>
                                updateReceived(
                                  item.id,
                                  event.target.value
                                )
                              }
                              className={`${styles.receivedInput} ${
                                mismatch
                                  ? styles.receivedInputMismatch
                                  : ''
                              }`}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    placeholder="Receiving notes (short/excess/damaged items, etc.)"
                    className={styles.notesInput}
                  />

                  {/* Save */}
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void save()}
                    className={styles.saveButton}
                  >
                    <CheckCircle2 />

                    <span>
                      {saving
                        ? 'Saving…'
                        : 'Save Physical Receiving'}
                    </span>
                  </button>
                </div>
              </ScrollPanel>
            </div>
          )}
        </section>
      </SplitPane>
    </div>
  )
}