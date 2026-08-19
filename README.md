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

**Phase 0 — Architecture & project standards**

This phase freezes the architecture, folder conventions, database principles, security rules, and phased roadmap. Application features begin in Phase 1.

See `docs/architecture.md` and `docs/development-phases.md`.
