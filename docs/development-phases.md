# Development Phases

Every phase is implemented on its own branch and merged only after its acceptance checks pass. A phase may add tables, modules, routes, components, tests, and documentation, but it must preserve existing contracts.

## Phase 0 — Architecture & standards

Freeze product scope, domain boundaries, folder structure, database principles, security rules, migration policy, responsive UX rules, and roadmap.

**Done when:** architecture documents exist and the project rules are unambiguous.

## Phase 1 — Application and database foundation

Create the Next.js application foundation, Supabase clients, environment handling, database migration conventions, organization/shop/branch foundation, profiles, and audit infrastructure.

**Done when:** the app boots cleanly and the migration pipeline is reproducible.

## Phase 2 — Mobile/password authentication

Implement signup/login/session/logout using mobile number + password, phone normalization, protected routes, account status, and password recovery strategy compatible with the chosen auth implementation.

**Done when:** a user can securely create an account, sign in, sign out, and access only authenticated areas.

## Phase 3 — Roles, permissions, and staff management

Implement Admin/Staff/User roles, permission assignment, user management, shop/branch scoping, and server-side authorization.

**Done when:** an Admin can grant/revoke staff capabilities and forbidden mutations are rejected server-side.

## Phase 4 — Responsive application shell

Build the reusable mobile/tablet/desktop navigation, dashboard shell, forms, tables, search, filters, dialogs, notifications, loading and error states.

**Done when:** the shell is usable at phone and desktop widths without duplicating the application.

## Phase 5 — Catalog masters

Categories, subcategories, brands, units, and products. Add validation, active/inactive status, search, and relationship rules.

**Done when:** Admin/authorized Staff can maintain the product catalog.

## Phase 6 — Inventory foundation

Opening stock, inventory movements, stock summary, minimum stock, and traceability.

**Done when:** stock changes can be traced to their source transaction or adjustment.

## Phase 7 — Parties

Customers, suppliers, party type, contact details, opening balance, credit limit, and search.

**Done when:** authorized users can maintain parties and their identity remains stable through UUID relationships.

## Phase 8 — Sales invoices

Draft/post/cancel sales invoices, invoice lines, stock-out posting, party balance posting, numbering, print-ready view, and validation.

## Phase 9 — Purchase invoices

Draft/post/cancel purchase invoices, stock-in posting, supplier balance posting, numbering, and print-ready view.

## Phase 10 — Receipts and payments

Record money received/paid, payment modes, references, posting rules, and history.

## Phase 11 — Party ledger

Unified party transaction view, opening balance, invoice entries, receipts/payments, running balance, filters, and statement view.

## Phase 12 — Expense management

Expense categories, expenses, payment mode, references, audit trail, and expense summaries.

## Phase 13 — Customer/User portal

Product browsing by category/subcategory/brand, availability, own invoices, own payments, and own ledger only.

## Phase 14 — Admin dashboard and analysis

Sales/purchase/receipt/payment/expense summaries, receivables/payables, stock indicators, trends, top products/parties, and initial P&L analysis based on the implemented financial model.

## Phase 15 — Hardening

Security review, RLS/authorization review, validation review, audit coverage, performance, indexes, error handling, accessibility, responsive QA, and automated tests.

## Phase 16 — Production release

Deployment, environment configuration, migration procedure, backup/restore plan, monitoring, release checklist, and operational documentation.

## Future phases

Potential extensions are explicitly outside the MVP: GST/tax, returns, quotations, purchase/sales orders, multiple warehouses, stock transfers, barcode workflows, advanced accounting, offline mode, native mobile apps, APIs, and external integrations.

## Phase discipline

1. Read the existing architecture and migrations before changing anything.
2. Add a migration for every database schema change.
3. Do not rewrite an earlier phase to make a later feature convenient.
4. Preserve IDs and stable relationships.
5. Add tests for critical business rules.
6. Update documentation with every architectural decision.
7. Keep each phase independently reviewable and deployable.
