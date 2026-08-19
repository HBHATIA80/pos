-- Phase 6: Parties
-- Scope: business-scoped customer/supplier master with opening balance metadata.
-- Ledger transactions, invoices, receipts and payments remain future phases.
-- No GST/tax logic is introduced.

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  party_code text,
  party_type text not null default 'customer',
  name text not null,
  phone text,
  alternate_phone text,
  email text,
  address text,
  city text,
  state text,
  postal_code text,
  opening_balance numeric(14,2) not null default 0,
  opening_balance_type text not null default 'none',
  credit_limit numeric(14,2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint parties_type_check check (party_type in ('customer','supplier','both')),
  constraint parties_name_length check (char_length(trim(name)) between 1 and 180),
  constraint parties_code_length check (party_code is null or char_length(trim(party_code)) between 1 and 40),
  constraint parties_opening_balance_check check (opening_balance >= 0),
  constraint parties_opening_balance_type_check check (opening_balance_type in ('none','receivable','payable')),
  constraint parties_credit_limit_check check (credit_limit >= 0),
  constraint parties_opening_type_consistency check (
    (opening_balance = 0 and opening_balance_type in ('none','receivable','payable'))
    or (opening_balance > 0 and opening_balance_type in ('receivable','payable'))
  )
);

create unique index parties_business_code_unique
  on public.parties (business_id, lower(trim(party_code)))
  where party_code is not null;
create index parties_business_type_active_name_idx
  on public.parties (business_id, party_type, is_active, name);
create index parties_business_phone_idx
  on public.parties (business_id, phone)
  where phone is not null;
create index parties_business_created_idx
  on public.parties (business_id, created_at desc);

create trigger parties_set_updated_at
before update on public.parties
for each row execute function public.set_updated_at();

alter table public.parties enable row level security;

create policy "business members can view parties"
on public.parties for select
to authenticated
using (business_id = public.current_business_id());

create policy "party managers can insert parties"
on public.parties for insert
to authenticated
with check (business_id = public.current_business_id() and public.has_permission('parties.manage'));

create policy "party managers can update parties"
on public.parties for update
to authenticated
using (business_id = public.current_business_id() and public.has_permission('parties.manage'))
with check (business_id = public.current_business_id());

create policy "party managers can delete parties"
on public.parties for delete
to authenticated
using (business_id = public.current_business_id() and public.has_permission('parties.manage'));

comment on table public.parties is 'Business-scoped customer and supplier master. Opening balance is the initial ledger baseline; future immutable transactions must reference this party.';
comment on column public.parties.party_type is 'customer, supplier, or both; text is used instead of an enum so future party classifications can evolve without replacing the type.';
comment on column public.parties.opening_balance_type is 'Direction of the opening balance: receivable, payable, or none.';
