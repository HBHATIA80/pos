-- ============================================================
-- Phase 7.2.1
-- Fix payment summary invoice_id ambiguity
-- ============================================================

drop function if exists public.get_sales_invoice_payment_summary(uuid);


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
  v_paid numeric(14,2) := 0;
begin

  -- ----------------------------------------------------------
  -- Find invoice for current business
  -- ----------------------------------------------------------

  select si.*
  into v_invoice
  from public.sales_invoices as si
  where si.id = p_invoice_id
    and si.business_id = public.current_business_id();

  if not found then
    raise exception 'Invoice not found';
  end if;


  -- ----------------------------------------------------------
  -- Calculate active payments
  --
  -- IMPORTANT:
  -- sp.invoice_id is explicitly qualified.
  -- This fixes the PostgreSQL ambiguity with the output
  -- variable named invoice_id.
  -- ----------------------------------------------------------

  select
    coalesce(sum(sp.amount), 0)
  into v_paid
  from public.sale_payments as sp
  where sp.invoice_id = p_invoice_id
    and sp.business_id = public.current_business_id()
    and sp.status = 'active';


  -- ----------------------------------------------------------
  -- Return payment summary
  -- ----------------------------------------------------------

  return query
  select
    v_invoice.id::uuid as invoice_id,
    v_invoice.grand_total::numeric as grand_total,
    round(v_paid, 2)::numeric as paid_amount,
    greatest(
      round(v_invoice.grand_total - v_paid, 2),
      0
    )::numeric as balance_amount,
    case
      when v_paid <= 0 then 'unpaid'::text
      when v_paid < v_invoice.grand_total then 'partial'::text
      else 'paid'::text
    end as payment_status;

end;
$$;


-- ============================================================
-- SECURITY
-- ============================================================

revoke execute
on function public.get_sales_invoice_payment_summary(uuid)
from public;

revoke execute
on function public.get_sales_invoice_payment_summary(uuid)
from anon;

grant execute
on function public.get_sales_invoice_payment_summary(uuid)
to authenticated;