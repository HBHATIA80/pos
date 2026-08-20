-- Phase 7.4: delivery completion integration
-- Existing admin/staff Complete/void actions must also respect the customer
-- order lifecycle. Completing a customer portal order means delivered.

create or replace function public.complete_sales_invoice(invoice_id uuid)
returns public.sales_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.sales_invoices;
  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();
begin
  if v_business_id is null or v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('sales.manage') then
    raise exception 'Sales permission required';
  end if;

  select * into v_invoice
  from public.sales_invoices
  where id = invoice_id
    and business_id = v_business_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status <> 'draft' then
    raise exception 'Only draft invoices can be completed';
  end if;

  if not exists (
    select 1
    from public.sales_invoice_items
    where sales_invoice_items.invoice_id = v_invoice.id
  ) then
    raise exception 'Invoice has no items';
  end if;

  if v_invoice.order_channel = 'customer_portal' then
    if v_invoice.order_status is null then
      v_invoice.order_status := 'placed';
    end if;

    if v_invoice.order_status not in ('placed', 'accepted', 'packed', 'out_for_delivery') then
      raise exception 'Customer order cannot be delivered from status %', v_invoice.order_status;
    end if;

    update public.sales_invoices
    set status = 'completed',
        order_status = 'delivered',
        sold_at = coalesce(sold_at, now()),
        completed_at = now()
    where id = v_invoice.id
    returning * into v_invoice;

    insert into public.sales_order_events (business_id, invoice_id, status, note, acted_by)
    values (
      v_business_id,
      v_invoice.id,
      'delivered',
      'Order marked delivered from the sales portal.',
      v_user_id
    );
  else
    update public.sales_invoices
    set status = 'completed',
        sold_at = coalesce(sold_at, now()),
        completed_at = now()
    where id = v_invoice.id
    returning * into v_invoice;
  end if;

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
declare
  v_invoice public.sales_invoices;
  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();
begin
  if v_business_id is null or v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('sales.manage') then
    raise exception 'Sales permission required';
  end if;

  select * into v_invoice
  from public.sales_invoices
  where id = invoice_id
    and business_id = v_business_id
  for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status = 'draft' and v_invoice.order_channel = 'customer_portal' then
    if v_invoice.order_status in ('delivered', 'cancelled') then
      raise exception 'Customer order is already %', v_invoice.order_status;
    end if;

    update public.sales_invoices
    set order_status = 'cancelled'
    where id = v_invoice.id
    returning * into v_invoice;

    insert into public.sales_order_events (business_id, invoice_id, status, note, acted_by)
    values (
      v_business_id,
      v_invoice.id,
      'cancelled',
      'Order cancelled from the sales portal.',
      v_user_id
    );

    return v_invoice;
  end if;

  if v_invoice.status <> 'completed' then
    raise exception 'Only completed invoices can be voided';
  end if;

  update public.sales_invoices
  set status = 'void'
  where id = v_invoice.id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

grant execute on function public.void_sales_invoice(uuid) to authenticated;
