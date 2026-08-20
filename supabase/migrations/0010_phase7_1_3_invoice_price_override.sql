-- ============================================================
-- Phase 7.1.3
-- Editable POS Selling Price
-- ============================================================
--
-- IMPORTANT:
-- Changing a price in POS changes ONLY the invoice line.
-- It does NOT change products.sale_price.
-- It does NOT change customer price lists.
--
-- No GST / tax.
-- ============================================================

alter table public.sales_invoice_items
  add column if not exists base_unit_price numeric(14,2);

alter table public.sales_invoice_items
  add column if not exists customer_unit_price numeric(14,2);

alter table public.sales_invoice_items
  add column if not exists selling_unit_price numeric(14,2);

-- Preserve the existing historical Phase 7 unit_price.
-- Existing invoices are treated as having the same base/effective
-- price because earlier versions did not store the distinction.
update public.sales_invoice_items
set
  base_unit_price = coalesce(base_unit_price, unit_price),
  selling_unit_price = coalesce(selling_unit_price, unit_price)
where
  base_unit_price is null
  or selling_unit_price is null;

-- Safety constraints.

alter table public.sales_invoice_items
  drop constraint if exists sales_invoice_items_base_price_check;

alter table public.sales_invoice_items
  add constraint sales_invoice_items_base_price_check
  check (
    base_unit_price is null
    or base_unit_price >= 0
  );

alter table public.sales_invoice_items
  drop constraint if exists sales_invoice_items_customer_price_check;

alter table public.sales_invoice_items
  add constraint sales_invoice_items_customer_price_check
  check (
    customer_unit_price is null
    or customer_unit_price >= 0
  );

alter table public.sales_invoice_items
  drop constraint if exists sales_invoice_items_selling_price_check;

alter table public.sales_invoice_items
  add constraint sales_invoice_items_selling_price_check
  check (
    selling_unit_price is null
    or selling_unit_price >= 0
  );

comment on column public.sales_invoice_items.base_unit_price is
'Product master selling price resolved when the invoice line was created.';

comment on column public.sales_invoice_items.customer_unit_price is
'Customer or price-list price resolved before any invoice-specific override.';

comment on column public.sales_invoice_items.selling_unit_price is
'Actual selling price used for this invoice line.';

-- Keep selling_unit_price synchronized with the existing
-- historical unit_price when older Phase 7 code inserts a line.
create or replace function public.sync_sales_item_selling_price()
returns trigger
language plpgsql
as $$
begin
  if new.selling_unit_price is null then
    new.selling_unit_price := new.unit_price;
  end if;

  if new.base_unit_price is null then
    new.base_unit_price := new.unit_price;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_sales_item_selling_price
on public.sales_invoice_items;

create trigger trg_sync_sales_item_selling_price
before insert or update on public.sales_invoice_items
for each row
execute function public.sync_sales_item_selling_price();