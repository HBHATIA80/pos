# Database Principles

## General

- PostgreSQL is the source of truth.
- All schema changes are SQL migrations committed to Git.
- Prefer UUID primary keys for business entities.
- Use explicit foreign keys and appropriate indexes.
- Use `created_at`, `updated_at`, and `created_by` where the domain requires them.
- Use active/status fields for master data instead of destructive deletion.

## Organization scope

Business data should be scoped to a shop and, when enabled, a branch. Authorization must prevent cross-shop access.

## Money

Use PostgreSQL `numeric` for monetary amounts. Never use JavaScript floating-point arithmetic as the source of truth for financial totals. Store document totals derived from validated line values so historical documents remain stable.

Initial scope has **no GST or tax columns/logic**. If taxation is introduced later, it should be added through an explicit versioned migration and domain module rather than scattered through existing UI code.

## Documents

Invoices and money transactions use stable document numbers separate from UUID primary keys. Document numbering is handled by a controlled sequence mechanism, not by counting rows in application code.

Use statuses such as:

```text
draft
posted
cancelled
```

Posted financial/inventory transactions should not be physically deleted. Corrections should use cancellation/reversal workflows introduced in the appropriate phase.

## Inventory

Inventory changes are represented by immutable or append-oriented movement records. A product's available stock is a derived result of movements and opening/adjustment records. Sales and purchases post inventory movements inside the same database transaction as their financial effects.

## Ledger

Party balances should be derived from posted events. A sale can increase a customer receivable; a receipt reduces it. A purchase can increase a supplier payable; a payment reduces it. Opening balances are explicit records. Avoid duplicating mutable balance numbers in multiple tables unless they are clearly defined as cached projections.

## Audit

Important mutations record actor, timestamp, entity, entity ID, action, and enough before/after information to investigate operational changes. Passwords, access tokens, and other secrets are never written to audit logs.

## RLS and server authorization

Row Level Security should be treated as a database safety boundary, not as a replacement for application permission checks. Server-side module actions enforce business permissions; RLS prevents accidental data leakage across users/shops/branches.

## Future compatibility

Avoid reserved-word table names, name-based foreign keys, duplicated party/product data in transaction lines, and destructive migrations. New features should be additive wherever practical.
