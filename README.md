# POS System

A mobile-ready and desktop-ready POS foundation for shop administration, staff operations, product/catalog management, inventory, sales, purchases, parties, receipts, payments, expenses, ledgers, and reporting.

## Product principles

- Start with the minimum usable POS and extend it phase by phase.
- No GST or tax in the initial scope.
- Authentication uses mobile number + password.
- Admin has full control; staff permissions are configurable; customers/users have limited read access.
- Financial and inventory transactions are append-oriented and auditable.
- Database changes are versioned SQL migrations.
- Every phase must be independently testable and must not require rewriting earlier phases.

## Current phase

**Phase 1 — Foundation**

The project now contains the runnable Next.js application shell, responsive styling, Supabase browser/server clients, session middleware, and the first future-ready SQL migration for businesses, profiles, roles, audit logs and RLS.

## Local development

```powershell
git clone https://github.com/HBHATIA80/pos.git
cd pos
git checkout phase-1-foundation
npm install
```

Create `.env.local` from `.env.example`, add your Supabase project URL and public/anon key, then run:

```powershell
npm run dev
```

Open `http://localhost:3000`.

Run `supabase/migrations/0001_phase1_foundation.sql` in the Supabase SQL Editor before developing against the database.

See `docs/phase-1-foundation.md` for the complete checklist.

## Next

Phase 2 will implement mobile-number + password signup/login and first-user/shop onboarding without replacing the Phase 1 schema.
