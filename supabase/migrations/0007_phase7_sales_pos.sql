-- Phase 7: Sales / POS transaction foundation
-- Scope: business-scoped sales invoices and immutable completed invoice lines.
-- No GST/tax, payments/receipts, or inventory movement is introduced here.

create sequence if not exists public.sales_invoice_number_seq;

create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  invoice_no text not null unique,
  party_id uuid references public.parties(id) on delete restrict,
  status text not null default 'draft',
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  notes text,
  sold_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_invoices_status_check check (status in ('draft','completed','void')),
  constraint sales_invoices_amounts_check check (subtotal >= 0 and discount_amount >= 0 and grand_total >= 0),
  constraint sales_invoices_total_check check (grand_total = subtotal - discount_amount),
  constraint sales_invoices_completed_at_check check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table public.sales_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null,
  product_name text not null,
  unit_name text not null,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  discount_amount numeric(14,2) not null default 0,
  line_total numeric(14,2) not null,
  created_at timestamptz not null default now(),
  constraint sales_invoice_items_quantity_check check (quantity > 0),
  constraint sales_invoice_items_price_check check (unit_price >= 0 and discount_amount >= 0 and line_total >= 0),
  constraint sales_invoice_items_total_check check (line_total = round((quantity * unit_price) - discount_amount, 2))
);

create index sales_invoices_business_status_created_idx on public.sales_invoices (business_id, status, created_at desc);
create index sales_invoices_business_party_idx on public.sales_invoices (business_id, party_id, created_at desc);
create index sales_invoice_items_invoice_idx on public.sales_invoice_items (invoice_id);
create index sales_invoice_items_product_idx on public.sales_invoice_items (product_id);

create trigger sales_invoices_set_updated_at
before update on public.sales_invoices
for each row execute function public.set_updated_at();

create or replace function public.create_sales_invoice(payload jsonb)
returns public.sales_invoices
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();
  v_invoice public.sales_invoices;
  v_item jsonb;
  v_product public.products;
  v_party public.parties;
  v_subtotal numeric(14,2) := 0;
  v_discount numeric(14,2) := 0;
  v_grand_total numeric(14,2) := 0;
  v_status text := coalesce(payload->>'status', 'draft');
  v_party_id uuid := nullif(payload->>'party_id','')::uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_item_discount numeric;
  v_line_total numeric(14,2);
begin
  if v_business_id is null or v_user_id is null then raise exception 'Unauthorized'; end if;
  if not public.has_permission('sales.manage') then raise exception 'Sales permission required'; end if;
  if v_status not in ('draft','completed') then raise exception 'Invalid sales status'; end if;

  if v_party_id is not null then
    select * into v_party from public.parties where id=v_party_id and business_id=v_business_id and is_active=true;
    if not found then raise exception 'Customer not found or inactive'; end if;
    if v_party.party_type not in ('customer','both') then raise exception 'Selected party is not a customer'; end if;
  end if;

  if jsonb_typeof(coalesce(payload->'items','null')) <> 'array' or jsonb_array_length(payload->'items') = 0 then raise exception 'At least one product is required'; end if;

  insert into public.sales_invoices (business_id, invoice_no, party_id, status, notes, sold_at, completed_at, created_by)
  values (
    v_business_id,
    'SI-' || lpad(nextval('public.sales_invoice_number_seq')::text, 8, '0'),
    v_party_id,
    v_status,
    nullif(trim(payload->>'notes'), ''),
    case when v_status='completed' then now() else null end,
    case when v_status='completed' then now() else null end,
    v_user_id
  ) returning * into v_invoice;

  for v_item in select * from jsonb_array_elements(payload->'items') loop
    select p.* into v_product from public.products p
    where p.id=nullif(v_item->>'product_id','')::uuid and p.business_id=v_business_id and p.is_active=true;
    if not found then raise exception 'Product not found or inactive'; end if;

    v_quantity := coalesce((v_item->>'quantity')::numeric,0);
    v_unit_price := coalesce((v_item->>'unit_price')::numeric,-1);
    v_item_discount := coalesce((v_item->>'discount_amount')::numeric,0);
    if v_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;
    if v_unit_price < 0 then raise exception 'Unit price cannot be negative'; end if;
    if v_item_discount < 0 then raise exception 'Discount cannot be negative'; end if;
    v_line_total := round((v_quantity * v_unit_price) - v_item_discount, 2);
    if v_line_total < 0 then raise exception 'Discount cannot exceed the line value'; end if;

    insert into public.sales_invoice_items (invoice_id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)
    values (
      v_invoice.id,
      v_product.id,
      v_product.sku,
      v_product.name,
      coalesce((select short_name from public.catalog_units where id=v_product.unit_id),'unit'),
      v_quantity,
      v_unit_price,
      v_item_discount,
      v_line_total
    );

    v_subtotal := v_subtotal + round(v_quantity * v_unit_price, 2);
    v_discount := v_discount + v_item_discount;
  end loop;

  v_grand_total := v_subtotal - v_discount;
  if v_grand_total < 0 then raise exception 'Invoice total cannot be negative'; end if;
  update public.sales_invoices set subtotal=v_subtotal, discount_amount=v_discount, grand_total=v_grand_total where id=v_invoice.id returning * into v_invoice;
  return v_invoice;
end;
$$;

grant execute on function public.create_sales_invoice(jsonb) to authenticated;

create or replace function public.complete_sales_invoice(invoice_id uuid)
returns public.sales_invoices
language plpgsql
security definer
set search_path = public
as $$
declare v_invoice public.sales_invoices;
begin
  if not public.has_permission('sales.manage') then raise exception 'Sales permission required'; end if;
  select * into v_invoice from public.sales_invoices where id=invoice_id and business_id=public.current_business_id();
  if not found then raise exception 'Invoice not found'; end if;
  if v_invoice.status <> 'draft' then raise exception 'Only draft invoices can be completed'; end if;
  if not exists (select 1 from public.sales_invoice_items where sales_invoice_items.invoice_id=v_invoice.id) then raise exception 'Invoice has no items'; end if;
  update public.sales_invoices set status='completed', sold_at=coalesce(sold_at,now()), completed_at=now() where id=v_invoice.id returning * into v_invoice;
  return v_invoice;
end;
$$;

grant execute on function public.complete_sales_invoice(uuid) to authenticated;

create or replace function public.void_sales_invoice(invoice_id uuid)
returns public.sales_invoices
language plpgsql
security definer
set search_path = public
as $$
declare v_invoice public.sales_invoices;
begin
  if not public.has_permission('sales.manage') then raise exception 'Sales permission required'; end if;
  select * into v_invoice from public.sales_invoices where id=invoice_id and business_id=public.current_business_id();
  if not found then raise exception 'Invoice not found'; end if;
  if v_invoice.status <> 'completed' then raise exception 'Only completed invoices can be voided'; end if;
  update public.sales_invoices set status='void' where id=v_invoice.id returning * into v_invoice;
  return v_invoice;
end;
$$;

grant execute on function public.void_sales_invoice(uuid) to authenticated;

alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_items enable row level security;

create policy "business members can view sales invoices"
on public.sales_invoices for select to authenticated using (business_id=public.current_business_id());

create policy "sales managers can insert sales invoices"
on public.sales_invoices for insert to authenticated with check (business_id=public.current_business_id() and public.has_permission('sales.manage'));

create policy "sales managers can update draft sales invoices"
on public.sales_invoices for update to authenticated
using (business_id=public.current_business_id() and public.has_permission('sales.manage') and status='draft')
with check (business_id=public.current_business_id() and status='draft');

create policy "business members can view sales invoice items"
on public.sales_invoice_items for select to authenticated
using (exists (select 1 from public.sales_invoices i where i.id=invoice_id and i.business_id=public.current_business_id()));

create policy "sales managers can insert sales invoice items"
on public.sales_invoice_items for insert to authenticated
with check (public.has_permission('sales.manage') and exists (select 1 from public.sales_invoices i where i.id=invoice_id and i.business_id=public.current_business_id() and i.status='draft'));

comment on table public.sales_invoices is 'Phase 7 sales transaction header. Completed invoices are immutable; inventory movement and payments are future phases.';
comment on table public.sales_invoice_items is 'Immutable product snapshots attached to sales invoices.';
