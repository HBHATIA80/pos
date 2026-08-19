# Phase 7.1 — Scalable POS & Customer Pricing

Phase 7.1 is mandatory before Phase 8.

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

## Phase 7.1.1 scope

This first increment adds the pricing tables, search indexes, product search API, party search API, and server-side price lookup API. The POS screen wiring and large-cart virtualization are subsequent 7.1 increments.

## Deferred

- GST/tax
- Inventory deduction
- Payments/receipts
- Returns/refunds
- Ledger postings
- Quantity-tier UI management
- Camera barcode scanning
