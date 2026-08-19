# Phase 5 — Product & Catalog Master

## Goal

Introduce the minimum usable product master without locking the database into future invoice or inventory assumptions.

## Included

- Products/items
- Categories
- Subcategories
- Brands
- Units
- SKU and optional barcode
- Purchase and sale price
- Opening stock snapshot
- Current stock snapshot
- Reorder level
- Active/inactive product availability
- Business-scoped RLS
- Admin/staff catalog management through the existing permission system
- Read-only product browsing for ordinary users
- Responsive catalog UI for desktop and mobile

## Deliberately excluded

- GST
- Tax
- HSN/SAC
- Sales invoices
- Purchase invoices
- Stock movement transactions
- Parties
- Payments/receipts
- Expense accounting
- P&L

Those belong to later phases.

## Database design

The schema is business-scoped using `business_id` on every catalog table. Products reference category, subcategory, brand and unit IDs instead of copying names. This allows future transactions to reference immutable product IDs while product names and masters can continue to evolve.

`opening_stock` and `current_stock` are intentionally snapshots for the MVP. Future inventory phases should introduce append-only stock movement tables and derive/report stock from those movements. Existing product IDs should not be replaced.

## SQL order

Run these migrations in order after the existing Phase 1–3 migrations:

```text
0004_phase5_product_catalog.sql
0005_phase5_user_product_visibility.sql
```

## Local test

```powershell
git fetch origin
git checkout phase-5-product-catalog
git pull
npm install
npm run dev
```

Open:

```text
http://localhost:3000/dashboard/products
```

Test as admin/staff:

1. Add a unit.
2. Add a category.
3. Add a subcategory under that category.
4. Add a brand.
5. Add a product using those masters.
6. Confirm SKU and optional barcode are stored.
7. Confirm opening stock becomes current stock.
8. Refresh and confirm data remains.
9. Test the screen on a narrow mobile viewport.

Test as ordinary user:

1. Open Products.
2. Confirm available products can be viewed.
3. Confirm inactive products are not returned by RLS.
4. Confirm no Add button is displayed.

## Future compatibility

Future sales/purchase/inventory tables should reference `products.id` and store transaction-time quantities/prices on invoice lines. They must not overwrite historical transaction values when a product's current price changes.
