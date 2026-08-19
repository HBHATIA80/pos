# Phase 7.1 — Scalable POS & Customer Pricing

Phase 7.1 is mandatory before Phase 8.

## Increment 7.1.1
- Business-scoped price lists
- Customer-to-price-list assignment
- Price-list product prices with quantity thresholds and validity dates
- Search indexes for products and parties
- Server-side product search by name/SKU/barcode
- Server-side party search by name/phone/code
- Server-side customer pricing lookup

## Increment 7.1.2
- POS product search uses `/api/pos/products` and loads at most 30 matching records.
- POS customer search uses `/api/pos/parties` and loads at most 30 matching records.
- Customer selection no longer uses a full customer dropdown.
- Product selection no longer depends on the full catalogue being loaded into the browser.
- Cart quantity changes re-resolve the server-side customer price.
- Cart lines display whether the base price or customer price list is being used.

## Rules
- Never load the full product catalogue into a browser dropdown.
- Never load the full party/customer list into a browser dropdown.
- Product and party lookup is server-side and returns a small result set.
- Product lookup supports name, SKU and barcode.
- Party lookup supports name, phone and party code.
- Customer pricing is resolved server-side.
- Product `sale_price` remains the base price.
- Customer price lists override the base price when applicable.
- Invoice lines must preserve the final unit price used at completion.
- Completed historical invoices must not change when product or pricing masters change.
- POS must support mobile and desktop layouts.
- Barcode scanners should work as keyboard-like input; native camera scanning can be added later.
- Large invoice line lists should use virtualization when needed.

## Deferred to later 7.1 increments
- Price-list management UI
- 100+ line virtualized invoice UI
- Barcode scanner UX
- Performance/load testing
- Quantity-tier management UX

## Deferred beyond 7.1
- GST/tax
- Inventory deduction
- Payments/receipts
- Returns/refunds
- Ledger postings
