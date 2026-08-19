# Architecture

## 1. Product scope

The POS is a responsive web application for mobile, tablet, and desktop. Initial business scope is deliberately tax-free: no GST/tax calculation is part of the MVP.

Primary actors:

- **Admin** — complete shop/branch configuration, users, permissions, catalog, inventory, parties, invoices, receipts, payments, expenses, and analysis.
- **Staff** — only the operations granted by permissions; can manage permitted users/catalog records, create sales and purchase invoices, record receipts/payments/expenses, and view permitted party ledgers.
- **User/Customer** — can browse available products by category/subcategory/brand and view only their own invoices and ledger.

## 2. Technical architecture

Use a modular monolith:

- Next.js + TypeScript for the application.
- PostgreSQL/Supabase for persistence.
- Supabase Auth for identity/session management.
- Server-side authorization for every protected mutation and sensitive read.
- Responsive component system for mobile-first screens that scale to desktop.
- Version-controlled SQL migrations as the source of truth for database structure.

Do not couple business rules directly to page components. UI calls module services/actions; module services validate input, authorize the actor, perform the transaction, and write audit information where required.

## 3. Core domains

```text
AUTH & ACCESS
  profiles, roles, permissions, user-role assignments

ORGANIZATION
  shops, branches, settings, number sequences

CATALOG
  categories, subcategories, brands, units, products

PARTIES
  customers, suppliers, addresses, balances

INVENTORY
  stock movements and inventory summaries

SALES
  sales invoices and invoice lines

PURCHASES
  purchase invoices and invoice lines

MONEY
  receipts, payments, payment modes

EXPENSES
  expense categories and expenses

LEDGER
  party ledger entries / derived views

REPORTING
  dashboard metrics and analysis queries

SYSTEM
  audit logs and application configuration
```

## 4. Data relationship principles

Use UUID primary keys for entities and explicit foreign keys for relationships. Never use display names as relationships.

Invoices have headers and line items. Product stock is represented by traceable inventory movements rather than trusting a manually edited stock number. Party balances are derived from posted financial events and opening balances. Financial documents use statuses such as `draft`, `posted`, and `cancelled`; important posted records are not hard-deleted.

## 5. Initial document flow

```text
PURCHASE INVOICE
      |
      +----> inventory IN
      |
      +----> supplier balance

SALE INVOICE
      |
      +----> inventory OUT
      |
      +----> customer balance

RECEIPT
      |
      +----> customer balance reduction

PAYMENT
      |
      +----> supplier balance reduction

EXPENSE
      |
      +----> expense/accounting record
```

## 6. Responsive UX

Desktop uses a sidebar + header + content layout. Mobile uses a compact header, drawer/navigation, cards, searchable lists, and bottom/quick actions where useful. Invoice entry must be usable on a phone without requiring a desktop-width table.

Shared UI primitives should include buttons, inputs, selects, dialogs, drawers, tables, cards, empty states, loading states, error states, pagination, search, filters, and confirmation actions.

## 7. Authorization model

Never rely on hidden navigation buttons as security. Every protected server action must check the authenticated user, shop/branch scope, role/permission, and record ownership where applicable.

Permission keys should be stable strings such as:

```text
users.view
users.manage
products.view
products.manage
categories.manage
parties.view
parties.manage
sales.view
sales.create
sales.cancel
purchases.view
purchases.create
receipts.create
payments.create
expenses.create
ledger.view
reports.view
settings.manage
```

The permission set can grow without redesigning the user model.

## 8. Extension strategy

Future features must extend this architecture rather than replace it. Possible later modules include multiple warehouses, stock transfers, returns, quotations, orders, barcode workflows, GST/tax, accounting journals, advanced P&L, supplier/customer portals, offline POS, APIs, and integrations.
