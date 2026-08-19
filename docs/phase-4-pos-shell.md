# Phase 4 — POS Shell & Responsive Navigation

## Goal

Establish the stable application shell before catalog, parties, invoices, payments and reporting modules are built.

## Included

- Responsive desktop sidebar.
- Collapsible desktop sidebar.
- Mobile slide-out navigation.
- Mobile bottom navigation.
- Business name and current user context in the header.
- Role-aware Team navigation for admins.
- Placeholder navigation for future POS modules without creating fake functionality.
- Dashboard home designed as the starting point for future analysis widgets.
- Existing authentication and Phase 3 team management remain intact.

## Navigation groups

### Workspace

- Dashboard
- Products — future phase
- Categories — future phase
- Parties — future phase
- Sales — future phase
- Purchases — future phase

### Accounts

- Payments — future phase
- Receipts — future phase
- Expenses — future phase
- Ledger — future phase
- Analysis — future phase, admin only

### Administration

- Team — available to admins from Phase 3

## Data model

Phase 4 does not introduce new business transaction tables. This is intentional. The shell is a UI foundation and should not force database changes before catalog and transaction requirements are finalized.

## Responsive behavior

- Desktop: fixed sidebar with optional collapse.
- Tablet: content uses responsive spacing and cards.
- Mobile: compact header, slide-out menu and bottom navigation.
- Touch targets use comfortable button sizes.

## Future extension rule

When a module becomes available, replace its disabled navigation item with a real route. Do not rename existing business concepts or move authentication/team routes unless there is a strong architectural reason.
