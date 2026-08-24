# POS System

A mobile-ready and desktop-ready POS platform for shop administration, staff operations, product/catalog management, inventory, sales, purchases, parties, payments, receipts, expenses, ledgers, customer ordering and reporting.

## Product principles

- Extend the POS phase by phase without replacing earlier work.
- No GST or tax in the current scope.
- Authentication uses mobile number + password.
- Admin has full control; staff permissions are configurable; customers have limited portal access.
- Financial and inventory transactions are auditable and business-scoped.
- Database changes are versioned SQL migrations.

## Implemented phases

- **Phase 1 — Foundation:** Next.js shell, Supabase clients, sessions, business/profile/RLS foundation.
- **Phase 2 — Authentication:** mobile/password authentication and onboarding.
- **Phase 3 — Admin & Staff:** roles, permissions, team management and shop access.
- **Phase 5 — Catalog:** products, categories, brands, units, pricing and stock fields.
- **Phase 6 — Parties:** customers, suppliers, party ledgers and customer codes.
- **Phase 7 — Sales/POS:** sales invoices, order management, customer ordering and payment/receipt support.
- **Phase 8 — Purchasing & Inventory:** purchase invoices, stock movement audit trail, stock updates on completed purchases/sales and low-stock monitoring.
- **Phase 9 — Accounts:** payment register, printable receipts and expense register.
- **Phase 10 — Analysis:** admin business KPIs, sales/expense analysis, stock valuation and low-stock reporting.
- **Phase 11 — Inventory Control:** manual stock adjustments, physical-count reconciliation, movement history and controlled inventory permissions.

## Current production status

The customer portal and admin workspace are live. Operations, Accounts, Analysis and Inventory Control are available from the admin workspace.

Database migrations live under `supabase/migrations/`. The latest source migration is `0024_phase11_inventory_control.sql`.

## Local development

```powershell
git clone https://github.com/HBHATIA80/pos.git
cd pos
npm install
npm run dev
```

Create `.env.local` from `.env.example` and add the Supabase project URL and public/anon key.
