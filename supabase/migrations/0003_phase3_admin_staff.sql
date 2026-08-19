-- Phase 3: Admin + Staff management and permission foundation.
-- Admins can create staff/user accounts through the server-side Auth Admin API.
-- Permission definitions are data-driven so future modules can add permissions without
-- redesigning the user model. No GST/tax logic is introduced.

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  module text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint permissions_code_length check (char_length(trim(code)) between 2 and 80),
  constraint permissions_name_length check (char_length(trim(name)) between 2 and 120)
);

create table public.profile_permissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (profile_id, permission_id)
);

create index profile_permissions_permission_idx on public.profile_permissions(permission_id);
create index profile_permissions_granted_by_idx on public.profile_permissions(granted_by);

insert into public.permissions (code, name, module, description, sort_order)
values
  ('team.view', 'View team', 'team', 'View staff and user accounts.', 10),
  ('team.manage', 'Manage team', 'team', 'Create, activate, deactivate and edit staff/user accounts.', 20),
  ('catalog.view', 'View catalog', 'catalog', 'View products and catalog masters.', 30),
  ('catalog.manage', 'Manage catalog', 'catalog', 'Manage products, categories, subcategories and brands.', 40),
  ('parties.view', 'View parties', 'parties', 'View customer and supplier parties.', 50),
  ('parties.manage', 'Manage parties', 'parties', 'Create and edit parties.', 60),
  ('sales.view', 'View sales', 'sales', 'View sales invoices.', 70),
  ('sales.manage', 'Manage sales', 'sales', 'Create and edit sales invoices.', 80),
  ('purchase.view', 'View purchases', 'purchases', 'View purchase invoices.', 90),
  ('purchase.manage', 'Manage purchases', 'purchases', 'Create and edit purchase invoices.', 100),
  ('payments.manage', 'Manage payments', 'payments', 'Record outgoing and incoming payments.', 110),
  ('receipts.manage', 'Manage receipts', 'receipts', 'Record receipts from parties.', 120),
  ('expenses.view', 'View expenses', 'expenses', 'View business expenses.', 130),
  ('expenses.manage', 'Manage expenses', 'expenses', 'Create and edit business expenses.', 140),
  ('ledger.view', 'View ledger', 'ledger', 'View party ledger information.', 150)
on conflict (code) do nothing;

alter table public.permissions enable row level security;
alter table public.profile_permissions enable row level security;

create policy "authenticated users can view permissions"
on public.permissions for select
to authenticated
using (true);

create policy "admins can view business profile permissions"
on public.profile_permissions for select
to authenticated
using (
  exists (
    select 1
    from public.profiles target
    where target.id = profile_permissions.profile_id
      and target.business_id = public.current_business_id()
      and public.current_user_role() = 'admin'
  )
  or profile_id = auth.uid()
);

create policy "admins can grant business profile permissions"
on public.profile_permissions for insert
to authenticated
with check (
  public.current_user_role() = 'admin'
  and granted_by = auth.uid()
  and exists (
    select 1
    from public.profiles target
    where target.id = profile_permissions.profile_id
      and target.business_id = public.current_business_id()
  )
);

create policy "admins can revoke business profile permissions"
on public.profile_permissions for delete
to authenticated
using (
  public.current_user_role() = 'admin'
  and exists (
    select 1
    from public.profiles target
    where target.id = profile_permissions.profile_id
      and target.business_id = public.current_business_id()
  )
);

create or replace function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.current_user_role() = 'admin' then true
    else exists (
      select 1
      from public.profile_permissions pp
      join public.permissions p on p.id = pp.permission_id
      where pp.profile_id = auth.uid()
        and p.code = permission_code
    )
  end;
$$;

grant execute on function public.has_permission(text) to authenticated;

comment on table public.permissions is 'Data-driven permission catalog for current and future POS modules.';
comment on table public.profile_permissions is 'Per-user permissions within the user business.';
comment on function public.has_permission(text) is 'Returns true for admins or when the current profile has the requested permission.';
