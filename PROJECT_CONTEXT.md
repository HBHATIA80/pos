# POS Project Context

## Purpose
Partronix POS is a multi-shop POS and accounting application built with Next.js, Supabase/PostgreSQL, TypeScript and Tailwind. It supports shop admins/staff and customer portal users.

## Repository
- GitHub: `HBHATIA80/pos`
- Main branch: `main`
- Production: `https://pos-aduz.vercel.app`
- Supabase project: `sgymvcjvbmtgodzinxdz`

## Current architecture
- Next.js App Router
- Supabase Auth + PostgreSQL + RLS
- Server Supabase client: `lib/supabase/server.ts`
- Middleware: `lib/supabase/middleware.ts`
- POS routes/pages under `app/dashboard`
- Customer portal under `app/dashboard/my-ledger`, `app/dashboard/orders`, and customer APIs
- Database migrations under `supabase/migrations`

## Roles
- `admin`: shop owner/business administrator
- `staff`: shop employee
- `user`: customer portal account

Public shop signup creates an admin/business. Customer signup joins an existing shop using a shop code and must create a `user`, never an admin.

## Multi-shop customers
A single customer Auth account may belong to multiple shops through the customer-business membership model. Each shop has its own customer Party record. Customer portal data must always be scoped to the currently selected shop membership/party.

Customer should be able to:
- select a shop
- see that shop's active products
- place orders for that shop
- see that shop's invoices
- see that shop's payments
- see that shop's ledger

Never expose another shop's data.

## Shop codes
Shop codes identify an existing shop for customer signup/joining. Admins should be able to see/copy/share their shop code from the admin UI.

## Customer codes
Party/customer codes are generated for customer parties, e.g. `CUST-000004`.

## Accounting model
Payments/receipts use a Busy-style voucher approach:
- receipt / money-in
- payment / money-out
- party/customer/supplier selection
- cash, bank, UPI, card, cheque, other
- reference/UTR/cheque number
- narration
- invoice-linked or general party transactions
- voucher numbers such as RV/PV

Party ledgers must include sales invoices, receipts/payments and other applicable accounting entries.

## Inventory
Inventory includes stock quantities, stock movements, purchases, sales, voids and manual adjustments. Keep stock and business isolation enforced by RLS/database permissions.

## Important UI principle
Do NOT use huge ordinary dropdowns for parties/products/invoices. Use smart search/autocomplete for large lists. Search should support name, code, phone/SKU where applicable, keyboard navigation and a small result set.

## Sales/Purchases UI direction
Sales and purchase forms should be comfortable and accounting-oriented, inspired by modern Busy-style workflows:
- keyboard friendly
- fast party/product search
- compact line-item grid
- quantity/rate/discount/tax/amount columns where applicable
- clear totals
- save/complete/print actions
- minimal unnecessary navigation

## Critical previous bugs to avoid
1. Customer API routes must not be redirected by page-level customer middleware. `/api/*` must be allowed through to its own auth/RLS logic.
2. Do not require `SUPABASE_SERVICE_ROLE_KEY` for ordinary authenticated customer/POS catalog operations when the authenticated Supabase client plus RLS is sufficient.
3. Do not create customer signup profiles as `admin`.
4. Customer product queries must scope to the customer's selected shop membership/business.
5. Customer ledger must scope to the selected shop and the customer's party in that shop.
6. Sales invoice items must be insertable by the trusted transaction/RPC flow without violating RLS.
7. Never weaken RLS merely to make a UI work.

## Migration history
The repository has historical phase migrations with some duplicate numeric prefixes (notably 0010/0011). Do not recreate or reorder historical migrations casually. New schema changes should use a new migration number after the latest existing migration.

Before pushing migrations:
- run `npx supabase migration list`
- use `npx supabase db push --dry-run`
- avoid `--include-all` unless intentionally reconciling historical migrations

## Deployment/testing
Production is deployed through Vercel from GitHub/main. After significant changes:
1. run TypeScript/build checks
2. deploy to Vercel
3. inspect Vercel build logs
4. inspect production runtime errors
5. test affected API/page flows
6. verify database/RLS changes

Do not claim a feature is tested if only compilation was checked.

## Current product phases
Implemented areas include:
- foundation/auth
- admin/staff
- product catalog
- sales/POS
- customer portal
- customer multi-shop membership
- customer ledger
- payments/receipts/vouchers
- purchasing
- expenses
- inventory/stock movements
- analysis/reporting
- shop-code management

Future work should extend the existing architecture rather than replacing working modules.
