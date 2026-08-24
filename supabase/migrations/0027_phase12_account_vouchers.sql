-- Phase 12: Busy-style payment / receipt vouchers.
-- Adds general party-facing cash/bank/other accounting entries while preserving
-- sale_payments for invoice-linked customer receipts.

create table if not exists public.account_vouchers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  voucher_no text not null,
  voucher_type text not null,
  party_id uuid references public.parties(id) on delete set null,
  payment_method text not null,
  account_name text,
  amount numeric(14,2) not null,
  reference_no text,
  notes text,
  paid_at timestamptz not null default now(),
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_vouchers_type_check check (voucher_type in ('receipt','payment')),
  constraint account_vouchers_method_check check (payment_method in ('cash','bank','upi','card','cheque','other')),
  constraint account_vouchers_amount_check check (amount > 0),
  constraint account_vouchers_status_check check (status in ('active','void'))
);

create unique index if not exists account_vouchers_business_no_unique
  on public.account_vouchers(business_id, voucher_no);
create index if not exists account_vouchers_business_date_idx
  on public.account_vouchers(business_id, paid_at desc);
create index if not exists account_vouchers_business_party_idx
  on public.account_vouchers(business_id, party_id, paid_at desc)
  where party_id is not null;
create index if not exists account_vouchers_business_type_idx
  on public.account_vouchers(business_id, voucher_type, paid_at desc);

create or replace function public.set_account_voucher_no()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_prefix text;
  v_next bigint;
begin
  if new.voucher_no is not null and btrim(new.voucher_no) <> '' then
    return new;
  end if;

  v_prefix := case when new.voucher_type = 'receipt' then 'RV-' else 'PV-' end;
  select coalesce(max((regexp_replace(voucher_no, '[^0-9]', '', 'g'))::bigint), 0) + 1
    into v_next
  from public.account_vouchers
  where business_id = new.business_id
    and voucher_type = new.voucher_type;

  new.voucher_no := v_prefix || lpad(v_next::text, 6, '0');
  return new;
end;
$$;

drop trigger if exists account_vouchers_set_no on public.account_vouchers;
create trigger account_vouchers_set_no
before insert on public.account_vouchers
for each row execute function public.set_account_voucher_no();

drop trigger if exists account_vouchers_set_updated_at on public.account_vouchers;
create trigger account_vouchers_set_updated_at
before update on public.account_vouchers
for each row execute function public.set_updated_at();

alter table public.account_vouchers enable row level security;

drop policy if exists "business members can view account vouchers" on public.account_vouchers;
create policy "business members can view account vouchers"
on public.account_vouchers for select
to authenticated
using (business_id = public.current_business_id());

drop policy if exists "business members can insert account vouchers" on public.account_vouchers;
create policy "business members can insert account vouchers"
on public.account_vouchers for insert
to authenticated
with check (business_id = public.current_business_id());

comment on table public.account_vouchers is 'General Busy-style receipt/payment vouchers for party, cash, bank and other account entries. Invoice-linked customer receipts remain in sale_payments.';
