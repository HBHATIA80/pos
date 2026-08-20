-- ============================================================
-- Phase 7.2 — Payment & Settlement Foundation
-- ============================================================
-- No GST / tax.
--
-- Design:
--   sales_invoices = invoice header
--   sales_invoice_items = invoice lines
--   sale_payments = actual money received
--
-- One invoice can have:
--   0 payments  -> UNPAID
--   1 payment   -> PAID or PARTIAL
--   many payments -> PAID or PARTIAL
--
-- Supported methods in MVP:
--   cash
--   bank
--
-- Future methods can be added without changing invoice structure.
-- ============================================================


create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),

  business_id uuid not null
    references public.businesses(id) on delete cascade,

  invoice_id uuid not null
    references public.sales_invoices(id) on delete restrict,

  party_id uuid
    references public.parties(id) on delete restrict,

  payment_method text not null,

  amount numeric(14,2) not null,

  reference_no text,

  notes text,

  paid_at timestamptz not null default now(),

  status text not null default 'active',

  created_by uuid
    references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint sale_payments_method_check
    check (payment_method in ('cash', 'bank')),

  constraint sale_payments_amount_check
    check (amount > 0),

  constraint sale_payments_status_check
    check (status in ('active', 'void'))
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_sale_payments_business
  on public.sale_payments (
    business_id,
    paid_at desc
  );

create index if not exists idx_sale_payments_invoice
  on public.sale_payments (
    invoice_id,
    status,
    paid_at desc
  );

create index if not exists idx_sale_payments_party
  on public.sale_payments (
    party_id,
    status,
    paid_at desc
  );

create index if not exists idx_sale_payments_method
  on public.sale_payments (
    business_id,
    payment_method,
    status,
    paid_at desc
  );


-- ============================================================
-- UPDATED_AT
-- ============================================================

create trigger sale_payments_set_updated_at
before update on public.sale_payments
for each row
execute function public.set_updated_at();


-- ============================================================
-- PAYMENT SUMMARY FUNCTION
-- ============================================================

create or replace function public.get_sales_invoice_payment_summary(
  p_invoice_id uuid
)
returns table (
  invoice_id uuid,
  grand_total numeric,
  paid_amount numeric,
  balance_amount numeric,
  payment_status text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice public.sales_invoices;
  v_paid numeric(14,2);
begin

  select *
  into v_invoice
  from public.sales_invoices
  where id = p_invoice_id
    and business_id = public.current_business_id();

  if not found then
    raise exception 'Invoice not found';
  end if;


  select coalesce(sum(amount), 0)
  into v_paid
  from public.sale_payments
  where invoice_id = p_invoice_id
    and business_id = public.current_business_id()
    and status = 'active';


  return query
  select
    v_invoice.id,
    v_invoice.grand_total,
    round(v_paid, 2),
    greatest(round(v_invoice.grand_total - v_paid, 2), 0),
    case
      when v_paid <= 0 then 'unpaid'
      when v_paid < v_invoice.grand_total then 'partial'
      else 'paid'
    end;

end;
$$;


grant execute
on function public.get_sales_invoice_payment_summary(uuid)
to authenticated;


-- ============================================================
-- RECORD PAYMENT
-- ============================================================

create or replace function public.record_sale_payment(
  p_invoice_id uuid,
  p_payment_method text,
  p_amount numeric,
  p_reference_no text default null,
  p_notes text default null,
  p_paid_at timestamptz default now()
)
returns public.sale_payments
language plpgsql
security definer
set search_path = public
as $$
declare

  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();

  v_invoice public.sales_invoices;

  v_existing_paid numeric(14,2);

  v_balance numeric(14,2);

  v_payment public.sale_payments;

begin

  -- ----------------------------------------------------------
  -- AUTH
  -- ----------------------------------------------------------

  if v_business_id is null
     or v_user_id is null then

    raise exception 'Unauthorized';

  end if;


  -- ----------------------------------------------------------
  -- PERMISSION
  -- ----------------------------------------------------------

  if not public.has_permission('sales.manage') then
    raise exception 'Sales permission required';
  end if;


  -- ----------------------------------------------------------
  -- VALIDATION
  -- ----------------------------------------------------------

  if p_payment_method not in ('cash', 'bank') then
    raise exception 'Invalid payment method';
  end if;


  if p_amount is null
     or p_amount <= 0 then

    raise exception 'Payment amount must be greater than zero';

  end if;


  -- ----------------------------------------------------------
  -- LOCK INVOICE
  -- ----------------------------------------------------------

  select *
  into v_invoice
  from public.sales_invoices
  where id = p_invoice_id
    and business_id = v_business_id
  for update;


  if not found then
    raise exception 'Invoice not found';
  end if;


  if v_invoice.status <> 'completed' then
    raise exception 'Only completed invoices can receive payments';
  end if;


  -- ----------------------------------------------------------
  -- CURRENT PAID AMOUNT
  -- ----------------------------------------------------------

  select coalesce(sum(amount), 0)
  into v_existing_paid
  from public.sale_payments
  where invoice_id = p_invoice_id
    and business_id = v_business_id
    and status = 'active';


  v_balance :=
    round(v_invoice.grand_total - v_existing_paid, 2);


  -- ----------------------------------------------------------
  -- PREVENT OVERPAYMENT
  -- ----------------------------------------------------------

  if v_balance <= 0 then
    raise exception 'Invoice is already fully paid';
  end if;


 if p_amount > v_balance then
  raise exception
    'Payment exceeds outstanding balance of %',
    to_char(v_balance, 'FM999999999990.00');
end if;

  -- ----------------------------------------------------------
  -- INSERT PAYMENT
  -- ----------------------------------------------------------

  insert into public.sale_payments (
    business_id,
    invoice_id,
    party_id,
    payment_method,
    amount,
    reference_no,
    notes,
    paid_at,
    status,
    created_by
  )
  values (
    v_business_id,
    v_invoice.id,
    v_invoice.party_id,
    p_payment_method,
    round(p_amount, 2),
    nullif(trim(p_reference_no), ''),
    nullif(trim(p_notes), ''),
    coalesce(p_paid_at, now()),
    'active',
    v_user_id
  )
  returning *
  into v_payment;


  return v_payment;

end;
$$;


grant execute
on function public.record_sale_payment(
  uuid,
  text,
  numeric,
  text,
  text,
  timestamptz
)
to authenticated;


-- ============================================================
-- VOID PAYMENT
-- ============================================================

create or replace function public.void_sale_payment(
  p_payment_id uuid
)
returns public.sale_payments
language plpgsql
security definer
set search_path = public
as $$
declare

  v_payment public.sale_payments;

begin

  if not public.has_permission('sales.manage') then
    raise exception 'Sales permission required';
  end if;


  select *
  into v_payment
  from public.sale_payments
  where id = p_payment_id
    and business_id = public.current_business_id()
  for update;


  if not found then
    raise exception 'Payment not found';
  end if;


  if v_payment.status <> 'active' then
    raise exception 'Payment is already void';
  end if;


  update public.sale_payments
  set
    status = 'void',
    updated_at = now()
  where id = v_payment.id
  returning *
  into v_payment;


  return v_payment;

end;
$$;


grant execute
on function public.void_sale_payment(uuid)
to authenticated;


-- ============================================================
-- RLS
-- ============================================================

alter table public.sale_payments
enable row level security;


-- View payments belonging to current business

create policy "business members can view sale payments"
on public.sale_payments
for select
to authenticated
using (
  business_id = public.current_business_id()
);


-- Insert payments

create policy "sales managers can insert sale payments"
on public.sale_payments
for insert
to authenticated
with check (
  business_id = public.current_business_id()
  and public.has_permission('sales.manage')
);


-- Update only when explicitly permitted.
-- Normal payment recording should use RPC.

create policy "sales managers can update sale payments"
on public.sale_payments
for update
to authenticated
using (
  business_id = public.current_business_id()
  and public.has_permission('sales.manage')
)
with check (
  business_id = public.current_business_id()
);


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.sale_payments is
'Phase 7.2 payment records for completed sales. Supports partial and multiple payments. No GST/tax.';

comment on column public.sale_payments.payment_method is
'Payment method. MVP supports cash and bank.';

comment on column public.sale_payments.amount is
'Actual money received against the invoice.';

comment on column public.sale_payments.status is
'active or void. Void payments remain for audit history.';


-- ============================================================
-- FUTURE READY
-- ============================================================
--
-- Later phases can add:
--
-- payment_accounts
-- bank accounts
-- cash counters
-- UPI
-- card
-- cheque
-- payment references
-- receipt numbers
-- payment allocations
-- purchase payments
-- customer ledger
-- supplier ledger
-- cash book
-- bank book
--
-- without changing sales_invoice_items.
--