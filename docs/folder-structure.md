# Folder Structure

The project is intentionally organized by responsibility so later phases can add modules without moving existing business logic.

```text
pos/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── parties/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── subcategories/
│   │   ├── brands/
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── purchases/
│   │   ├── receipts/
│   │   ├── payments/
│   │   ├── expenses/
│   │   ├── ledger/
│   │   ├── reports/
│   │   └── settings/
│   ├── customer/
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   └── feedback/
│
├── modules/
│   ├── auth/
│   ├── organization/
│   ├── access/
│   ├── catalog/
│   ├── parties/
│   ├── inventory/
│   ├── sales/
│   ├── purchases/
│   ├── money/
│   ├── expenses/
│   ├── ledger/
│   └── reports/
│
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── permissions/
│   ├── validation/
│   ├── money/
│   ├── numbers/
│   └── utils/
│
├── types/
├── supabase/
│   ├── migrations/
│   └── seed/
├── docs/
└── tests/
```

## Rules

- `app/` owns routes, page composition, loading/error boundaries, and route-level concerns.
- `components/` owns reusable presentation components and contains no database-specific business rules.
- `modules/` owns business logic by domain.
- `lib/` owns cross-cutting infrastructure and utilities.
- `types/` owns shared TypeScript contracts where a domain-local type is not more appropriate.
- `supabase/migrations/` is the database source of truth.
- `docs/` records architecture and phase decisions.
- `tests/` contains automated tests organized by domain.

Do not create a giant `utils.ts`, giant API route, or giant dashboard component. Keep domain logic close to its module.
