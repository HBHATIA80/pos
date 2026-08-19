-- Phase 7.1: scalable customer pricing foundation
-- No GST/tax. Prices are business-scoped and historical invoice lines remain snapshots.

create table if not exists public.price_lists (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create table if not exists public.customer_price_lists (
  customer_id uuid primary key references public.parties(id) on delete cascade,
  price_list_id uuid not null references public.price_lists(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  selling_price numeric(14,2) not null check (selling_price >= 0),
  min_quantity numeric(14,3) not null default 1 check (min_quantity > 0),
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (price_list_id, product_id, min_quantity)
);

create index if not exists idx_price_lists_business_active
  on public.price_lists(business_id, is_active, name);
create index if not exists idx_customer_price_lists_price_list
  on public.customer_price_lists(price_list_id);
create index if not exists idx_price_list_items_product
  on public.price_list_items(product_id, price_list_id, is_active);

alter table public.price_lists enable row level security;
alter table public.customer_price_lists enable row level security;
alter table public.price_list_items enable row level security;

create policy "price_lists_select_business"
  on public.price_lists for select
  using (business_id = public.current_business_id());

create policy "price_lists_manage_business"
  on public.price_lists for all
  using (business_id = public.current_business_id() and public.has_permission('catalog.manage'))
  with check (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "customer_price_lists_select_business"
  on public.customer_price_lists for select
  using (
    exists (
      select 1 from public.parties p
      where p.id = customer_price_lists.customer_id
        and p.business_id = public.current_business_id()
    )
  );

create policy "customer_price_lists_manage_business"
  on public.customer_price_lists for all
  using (
    public.has_permission('catalog.manage') and exists (
      select 1 from public.parties p
      join public.price_lists pl on pl.business_id = p.business_id
      where p.id = customer_price_lists.customer_id
        and pl.id = customer_price_lists.price_list_id
        and p.business_id = public.current_business_id()
    )
  )
  with check (
    public.has_permission('catalog.manage') and exists (
      select 1 from public.parties p
      join public.price_lists pl on pl.business_id = p.business_id
      where p.id = customer_price_lists.customer_id
        and pl.id = customer_price_lists.price_list_id
        and p.business_id = public.current_business_id()
    )
  );

create policy "price_list_items_select_business"
  on public.price_list_items for select
  using (
    exists (
      select 1 from public.price_lists pl
      where pl.id = price_list_items.price_list_id
        and pl.business_id = public.current_business_id()
    )
  );

create policy "price_list_items_manage_business"
  on public.price_list_items for all
  using (
    public.has_permission('catalog.manage') and exists (
      select 1 from public.price_lists pl
      where pl.id = price_list_items.price_list_id
        and pl.business_id = public.current_business_id()
    )
  )
  with check (
    public.has_permission('catalog.manage') and exists (
      select 1 from public.price_lists pl
      where pl.id = price_list_items.price_list_id
        and pl.business_id = public.current_business_id()
    )
  );

-- Customer lookup and pricing must always be constrained to the current business.
create index if not exists idx_parties_business_name_search
  on public.parties(business_id, is_active, name);
create index if not exists idx_parties_business_phone_search
  on public.parties(business_id, phone);
create index if not exists idx_parties_business_code_search
  on public.parties(business_id, party_code);
create index if not exists idx_products_business_name_search
  on public.products(business_id, is_active, name);
create index if not exists idx_products_business_sku_search
  on public.products(business_id, sku);
create index if not exists idx_products_business_barcode_search
  on public.products(business_id, barcode);
