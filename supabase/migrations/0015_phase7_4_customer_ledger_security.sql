-- Phase 7.4: customer ledger security hardening
-- Ordinary users may see only payments belonging to their own customer portal orders.

drop policy if exists "business members can view sale payments" on public.sale_payments;
drop policy if exists "customer users can view own sale payments" on public.sale_payments;

create policy "customer users can view own sale payments"
on public.sale_payments
for select
to authenticated
using (
  business_id = public.current_business_id()
  and (
    public.current_user_role() in ('admin', 'staff')
    or exists (
      select 1
      from public.sales_invoices i
      where i.id = sale_payments.invoice_id
        and i.business_id = public.current_business_id()
        and i.order_channel = 'customer_portal'
        and i.created_by = auth.uid()
    )
  )
);

-- Customer users cannot write payment records directly. Payments remain a
-- business-side settlement action through record_sale_payment().
drop policy if exists "sales managers can insert sale payments" on public.sale_payments;
create policy "sales managers can insert sale payments"
on public.sale_payments
for insert
to authenticated
with check (
  business_id = public.current_business_id()
  and public.has_permission('sales.manage')
);

drop policy if exists "sales managers can update sale payments" on public.sale_payments;
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
