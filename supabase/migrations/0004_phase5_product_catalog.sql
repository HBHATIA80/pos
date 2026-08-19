-- Phase 5: Product & Catalog Master
-- Scope: categories, subcategories, brands, units and products.
-- No GST/tax columns or logic are introduced.
-- All master data is business-scoped and safe for future transaction phases.

create table public.catalog_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  code text,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_categories_name_length check (char_length(trim(name)) between 1 and 120),
  constraint catalog_categories_code_length check (code is null or char_length(trim(code)) between 1 and 40)
);

create unique index catalog_categories_business_name_unique
  on public.catalog_categories (business_id, lower(trim(name)));
create unique index catalog_categories_business_code_unique
  on public.catalog_categories (business_id, lower(trim(code)))
  where code is not null;
create index catalog_categories_business_active_idx
  on public.catalog_categories (business_id, is_active, name);

create table public.catalog_subcategories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.catalog_categories(id) on delete restrict,
  name text not null,
  code text,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_subcategories_name_length check (char_length(trim(name)) between 1 and 120),
  constraint catalog_subcategories_code_length check (code is null or char_length(trim(code)) between 1 and 40)
);

create unique index catalog_subcategories_business_category_name_unique
  on public.catalog_subcategories (business_id, category_id, lower(trim(name)));
create index catalog_subcategories_business_category_idx
  on public.catalog_subcategories (business_id, category_id, is_active, name);

create table public.catalog_brands (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  code text,
  description text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_brands_name_length check (char_length(trim(name)) between 1 and 120),
  constraint catalog_brands_code_length check (code is null or char_length(trim(code)) between 1 and 40)
);

create unique index catalog_brands_business_name_unique
  on public.catalog_brands (business_id, lower(trim(name)));
create unique index catalog_brands_business_code_unique
  on public.catalog_brands (business_id, lower(trim(code)))
  where code is not null;
create index catalog_brands_business_active_idx
  on public.catalog_brands (business_id, is_active, name);

create table public.catalog_units (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  short_name text not null,
  decimal_places smallint not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_units_name_length check (char_length(trim(name)) between 1 and 60),
  constraint catalog_units_short_name_length check (char_length(trim(short_name)) between 1 and 20),
  constraint catalog_units_decimal_places_check check (decimal_places between 0 and 6)
);

create unique index catalog_units_business_name_unique
  on public.catalog_units (business_id, lower(trim(name)));
create unique index catalog_units_business_short_name_unique
  on public.catalog_units (business_id, lower(trim(short_name)));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sku text not null,
  barcode text,
  name text not null,
  description text,
  category_id uuid references public.catalog_categories(id) on delete restrict,
  subcategory_id uuid references public.catalog_subcategories(id) on delete restrict,
  brand_id uuid references public.catalog_brands(id) on delete restrict,
  unit_id uuid not null references public.catalog_units(id) on delete restrict,
  purchase_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  opening_stock numeric(14,3) not null default 0,
  current_stock numeric(14,3) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sku_length check (char_length(trim(sku)) between 1 and 80),
  constraint products_name_length check (char_length(trim(name)) between 1 and 180),
  constraint products_barcode_length check (barcode is null or char_length(trim(barcode)) between 1 and 80),
  constraint products_prices_nonnegative check (purchase_price >= 0 and sale_price >= 0),
  constraint products_stock_nonnegative check (opening_stock >= 0 and current_stock >= 0 and reorder_level >= 0)
);

create unique index products_business_sku_unique
  on public.products (business_id, lower(trim(sku)));
create unique index products_business_barcode_unique
  on public.products (business_id, lower(trim(barcode)))
  where barcode is not null;
create index products_business_active_name_idx
  on public.products (business_id, is_active, name);
create index products_business_category_idx
  on public.products (business_id, category_id);
create index products_business_subcategory_idx
  on public.products (business_id, subcategory_id);
create index products_business_brand_idx
  on public.products (business_id, brand_id);

-- Keep all catalog timestamps consistent with the foundation trigger.
create trigger catalog_categories_set_updated_at
before update on public.catalog_categories
for each row execute function public.set_updated_at();

create trigger catalog_subcategories_set_updated_at
before update on public.catalog_subcategories
for each row execute function public.set_updated_at();

create trigger catalog_brands_set_updated_at
before update on public.catalog_brands
for each row execute function public.set_updated_at();

create trigger catalog_units_set_updated_at
before update on public.catalog_units
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- Validate that child masters cannot point to another business.
create or replace function public.validate_catalog_business_links()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'catalog_subcategories' then
    if not exists (
      select 1 from public.catalog_categories c
      where c.id = new.category_id and c.business_id = new.business_id
    ) then
      raise exception 'Category does not belong to the current business';
    end if;
  elsif tg_table_name = 'products' then
    if new.category_id is not null and not exists (
      select 1 from public.catalog_categories c
      where c.id = new.category_id and c.business_id = new.business_id
    ) then
      raise exception 'Category does not belong to the current business';
    end if;
    if new.subcategory_id is not null and not exists (
      select 1 from public.catalog_subcategories s
      where s.id = new.subcategory_id and s.business_id = new.business_id
    ) then
      raise exception 'Subcategory does not belong to the current business';
    end if;
    if new.brand_id is not null and not exists (
      select 1 from public.catalog_brands b
      where b.id = new.brand_id and b.business_id = new.business_id
    ) then
      raise exception 'Brand does not belong to the current business';
    end if;
    if not exists (
      select 1 from public.catalog_units u
      where u.id = new.unit_id and u.business_id = new.business_id
    ) then
      raise exception 'Unit does not belong to the current business';
    end if;
  end if;
  return new;
end;
$$;

create trigger catalog_subcategories_validate_business
before insert or update on public.catalog_subcategories
for each row execute function public.validate_catalog_business_links();

create trigger products_validate_business_links
before insert or update on public.products
for each row execute function public.validate_catalog_business_links();

-- RLS: every business sees only its own catalog. Admin/staff can manage it;
-- ordinary users can only see active products and active masters used by products.
alter table public.catalog_categories enable row level security;
alter table public.catalog_subcategories enable row level security;
alter table public.catalog_brands enable row level security;
alter table public.catalog_units enable row level security;
alter table public.products enable row level security;

create policy "business members can view categories"
on public.catalog_categories for select
to authenticated
using (business_id = public.current_business_id());

create policy "catalog managers can insert categories"
on public.catalog_categories for insert
to authenticated
with check (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "catalog managers can update categories"
on public.catalog_categories for update
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'))
with check (business_id = public.current_business_id());

create policy "catalog managers can delete categories"
on public.catalog_categories for delete
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "business members can view subcategories"
on public.catalog_subcategories for select
to authenticated
using (business_id = public.current_business_id());

create policy "catalog managers can insert subcategories"
on public.catalog_subcategories for insert
to authenticated
with check (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "catalog managers can update subcategories"
on public.catalog_subcategories for update
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'))
with check (business_id = public.current_business_id());

create policy "catalog managers can delete subcategories"
on public.catalog_subcategories for delete
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "business members can view brands"
on public.catalog_brands for select
to authenticated
using (business_id = public.current_business_id());

create policy "catalog managers can insert brands"
on public.catalog_brands for insert
to authenticated
with check (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "catalog managers can update brands"
on public.catalog_brands for update
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'))
with check (business_id = public.current_business_id());

create policy "catalog managers can delete brands"
on public.catalog_brands for delete
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "business members can view units"
on public.catalog_units for select
to authenticated
using (business_id = public.current_business_id());

create policy "catalog managers can insert units"
on public.catalog_units for insert
to authenticated
with check (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "catalog managers can update units"
on public.catalog_units for update
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'))
with check (business_id = public.current_business_id());

create policy "catalog managers can delete units"
on public.catalog_units for delete
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "business members can view products"
on public.products for select
to authenticated
using (business_id = public.current_business_id());

create policy "catalog managers can insert products"
on public.products for insert
to authenticated
with check (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

create policy "catalog managers can update products"
on public.products for update
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'))
with check (business_id = public.current_business_id());

create policy "catalog managers can delete products"
on public.products for delete
to authenticated
using (business_id = public.current_business_id() and public.has_permission('catalog.manage'));

comment on table public.products is 'Business-scoped product master. Inventory transactions will be added in a later phase; current_stock is the initial stock snapshot.';
comment on table public.catalog_categories is 'Business-scoped product categories.';
comment on table public.catalog_subcategories is 'Business-scoped subcategories belonging to a category.';
comment on table public.catalog_brands is 'Business-scoped brands.';
comment on table public.catalog_units is 'Business-scoped units with configurable decimal precision.';
