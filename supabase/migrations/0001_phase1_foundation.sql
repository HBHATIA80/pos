-- Phase 1: Foundation schema
-- Scope: shop identity, users/roles, audit trail and RLS primitives.
-- No GST/tax tables are introduced in the MVP.

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'staff', 'user');
create type public.business_status as enum ('active', 'inactive');

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  phone text,
  address text,
  status public.business_status not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_name_length check (char_length(trim(name)) between 2 and 120),
  constraint businesses_code_length check (code is null or char_length(trim(code)) between 2 and 40)
);

create unique index businesses_code_unique_idx
  on public.businesses (lower(code))
  where code is not null;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  role public.user_role not null default 'user',
  full_name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_length check (char_length(trim(full_name)) between 2 and 120)
);

create index profiles_business_id_idx on public.profiles (business_id);
create index profiles_role_idx on public.profiles (role);
create index profiles_phone_idx on public.profiles (phone);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid references public.businesses(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_business_created_idx
  on public.audit_logs (business_id, created_at desc);
create index audit_logs_actor_created_idx
  on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

grant execute on function public.current_business_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_logs enable row level security;

create policy "business members can view their business"
on public.businesses for select
to authenticated
using (id = public.current_business_id() or created_by = auth.uid());

create policy "authenticated users can create a business"
on public.businesses for insert
to authenticated
with check (created_by = auth.uid());

create policy "business admins can update their business"
on public.businesses for update
to authenticated
using (id = public.current_business_id() and public.current_user_role() = 'admin')
with check (id = public.current_business_id());

create policy "users can view their own profile"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or (
    business_id = public.current_business_id()
    and public.current_user_role() = 'admin'
  )
);

create policy "users can create their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "admins can update business profiles"
on public.profiles for update
to authenticated
using (
  business_id = public.current_business_id()
  and public.current_user_role() = 'admin'
)
with check (business_id = public.current_business_id());

create policy "users can view their business audit logs"
on public.audit_logs for select
to authenticated
using (business_id = public.current_business_id());

create policy "authenticated users can append audit logs"
on public.audit_logs for insert
to authenticated
with check (
  actor_id = auth.uid()
  and (business_id is null or business_id = public.current_business_id())
);

-- Future phases will add catalog, parties, inventory, sales, purchases,
-- receipts, payments, expenses and reporting tables. They should reference
-- businesses.id and use immutable transaction rows instead of destructive
-- updates so historical reporting remains reliable.
