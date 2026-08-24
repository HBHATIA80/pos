# AI Handoff — Partronix POS

## Read this first
Before changing code, read `PROJECT_CONTEXT.md` and inspect the current repository. Treat the repository and live database/deployment state as authoritative over old chat messages.

## User's development goal
Build a complete, production-quality POS + accounting system that is comfortable for daily business use and supports:
- Admin/staff POS
- Products and inventory
- Sales and purchases
- Customers/parties and suppliers
- Busy-style receipts/payments/vouchers
- Party ledgers
- Customer portal
- Multi-shop customers
- Invoices and payments
- Reports/analysis

The user expects the assistant to make changes directly in the connected GitHub/Supabase/Vercel environment when tools allow it, rather than repeatedly giving manual instructions.

## Working rules
1. Preserve existing working functionality.
2. Prefer small, reversible changes.
3. Inspect existing code before replacing files.
4. Use new Supabase migrations for schema changes; do not rewrite historical migrations.
5. Preserve business/shop isolation everywhere.
6. Preserve RLS. Fix authorization correctly instead of bypassing it.
7. Customer APIs must return JSON and must not be redirected by dashboard page middleware.
8. Customer data is always scoped by authenticated customer + selected shop membership + shop-specific party.
9. A customer can belong to multiple shops with one Auth account.
10. Never turn customer signup into admin signup.
11. Use smart search for large Party/Product/Invoice lists instead of huge dropdowns.
12. Keep forms keyboard-friendly and fast for accounting/POS operators.
13. Avoid fake/test financial transactions in production.
14. Do not delete business/customer financial data unless the user explicitly asks and the deletion scope is unambiguous.

## Debugging priority
When a feature shows no data:
1. Check browser/API request status.
2. Check Vercel runtime logs.
3. Check middleware for redirects (especially 307).
4. Check authenticated user/profile/business/shop membership.
5. Check Supabase RLS/policies.
6. Check actual database rows.
7. Only then change UI/query code.

When a Vercel build fails:
- inspect build logs first
- fix the actual compile/type/import issue
- redeploy
- inspect runtime errors after deployment

## Customer portal acceptance criteria
For a customer connected to Shop A:
- Shop A appears in shop selector.
- Active Shop A products appear.
- Customer can place Shop A order.
- Shop A invoice appears after completion/delivery as appropriate.
- Shop A payments appear.
- Shop A ledger shows debits/credits/running balance.
- Date-from/date-to filtering works.
- Switching to Shop B changes all these datasets to Shop B.
- Shop A data never appears while Shop B is selected.

## Accounting acceptance criteria
Receipt voucher should support money received from a party/customer, optionally against an invoice, with payment mode/account/reference/narration.

Payment voucher should support money paid to a party/supplier, optionally against an invoice, with payment mode/account/reference/narration.

Party ledger should combine invoices, receipts, payments and relevant adjustments in chronological order with running balance.

## UI/UX acceptance criteria
- Fast search fields for large masters.
- Clear selected-party/product cards.
- Keyboard navigation.
- Compact accounting line-item grids.
- Sticky/visible totals.
- Clear Save/Complete/Print actions.
- Responsive desktop/tablet/mobile layouts.
- Avoid unnecessary modals and navigation.
- Use Indian currency formatting where money is displayed.

## Deployment checklist
Before declaring a task complete:
- GitHub changes committed to `main` (unless intentionally using a feature branch).
- TypeScript/build passes.
- Supabase migration dry-run checked if schema changed.
- Migration applied if required.
- Vercel deployment is READY.
- Production runtime errors checked.
- Relevant page/API manually or programmatically tested where possible.

## Important context continuity
This file exists because the original development conversation may reach the ChatGPT message limit. A new chat should continue from these repository documents and current GitHub/Supabase/Vercel state rather than relying on the old chat transcript.
