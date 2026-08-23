-- Phase 7.4: customer codes + POS invoice-item RLS fix
-- Customer codes are generated automatically for existing and future parties.
-- The sales invoice RPC is SECURITY DEFINER so a completed POS sale can insert
-- its immutable invoice lines without being blocked by the draft-only line policy.

create sequence if not exists public.customer_party_code_seq;

create or replace function public.assign_customer_party_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.party_code is null or btrim(new.party_code) = '' then
    new.party_code := 'CUST-' || lpad(nextval('public.customer_party_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_customer_party_code on public.parties;
create trigger trg_assign_customer_party_code
before insert or update on public.parties
for each row
execute function public.assign_customer_party_code();

update public.parties
set party_code = 'CUST-' || lpad(nextval('public.customer_party_code_seq')::text, 6, '0')
where party_code is null or btrim(party_code) = '';

create unique index if not exists parties_party_code_unique_idx
on public.parties(party_code)
where party_code is not null;

comment on column public.parties.party_code is
'Auto-generated durable customer/party code used in the shop party list and customer portal ledger linkage.';

create or replace function public.create_sales_invoice(payload jsonb)
returns public.sales_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();
  v_invoice public.sales_invoices;
  v_item jsonb;
  v_product public.products;
  v_party public.parties;
  v_subtotal numeric(14,2) := 0;
  v_discount numeric(14,2) := 0;
  v_grand_total numeric(14,2) := 0;
  v_status text := coalesce(payload->>'status', 'draft');
  v_party_id uuid := nullif(payload->>'party_id','')::uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_item_discount numeric;
  v_line_total numeric(14,2);
  v_is_order boolean := false;
begin
  if v_business_id is null or v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if not public.has_permission('sales.manage')
     and not public.has_permission('orders.place') then
    raise exception 'Sales permission required';
  end if;

  v_is_order := public.has_permission('orders.place')
                and not public.has_permission('sales.manage');

  if v_is_order then
    v_status := 'draft';
    select m.party_id into v_party_id
    from public.customer_business_memberships m
    where m.user_id = v_user_id
      and m.business_id = v_business_id
      and m.is_active = true
    order by m.is_primary desc, m.joined_at asc
    limit 1;

    if v_party_id is null then
      raise exception 'Customer is not connected to this shop';
    end if;
  elsif v_status not in ('draft','completed') then
    raise exception 'Invalid sales status';
  end if;

  if v_party_id is not null then
    select * into v_party
    from public.parties
    where id = v_party_id
      and business_id = v_business_id
      and is_active = true;

    if not found then raise exception 'Customer not found or inactive'; end if;
    if v_party.party_type not in ('customer','both') then raise exception 'Selected party is not a customer'; end if;
  end if;

  if jsonb_typeof(coalesce(payload->'items','null')) <> 'array'
     or jsonb_array_length(payload->'items') = 0 then
    raise exception 'At least one product is required';
  end if;

  insert into public.sales_invoices
    (business_id, invoice_no, party_id, status, notes, sold_at, completed_at, created_by, order_channel, order_status)
  values (
    v_business_id,
    'SI-' || lpad(nextval('public.sales_invoice_number_seq')::text, 8, '0'),
    v_party_id,
    v_status,
    nullif(trim(payload->>'notes'), ''),
    case when v_status = 'completed' then now() else null end,
    case when v_status = 'completed' then now() else null end,
    v_user_id,
    case when v_is_order then 'customer_portal' else 'pos' end,
    case when v_is_order then 'placed' else null end
  ) returning * into v_invoice;

  for v_item in select * from jsonb_array_elements(payload->'items') loop
    select p.* into v_product
    from public.products p
    where p.id = nullif(v_item->>'product_id','')::uuid
      and p.business_id = v_business_id
      and p.is_active = true;

    if not found then raise exception 'Product not found or inactive'; end if;

    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    if v_quantity <= 0 then raise exception 'Quantity must be greater than zero'; end if;

    if v_is_order then
      v_unit_price := v_product.sale_price;
      v_item_discount := 0;
    else
      v_unit_price := coalesce((v_item->>'unit_price')::numeric, -1);
      v_item_discount := coalesce((v_item->>'discount_amount')::numeric, 0);
      if v_unit_price < 0 then raise exception 'Unit price cannot be negative'; end if;
      if v_item_discount < 0 then raise exception 'Discount cannot be negative'; end if;
    end if;

    v_line_total := round((v_quantity * v_unit_price) - v_item_discount, 2);
    if v_line_total < 0 then raise exception 'Discount cannot exceed the line value'; end if;

    insert into public.sales_invoice_items
      (invoice_id, product_id, sku, product_name, unit_name, quantity, unit_price, discount_amount, line_total)
    values (
      v_invoice.id,
      v_product.id,
      v_product.sku,
      v_product.name,
      coalesce((select short_name from public.catalog_units where id = v_product.unit_id), 'unit'),
      v_quantity,
      v_unit_price,
      v_item_discount,
      v_line_total
    );

    v_subtotal := v_subtotal + round(v_quantity * v_unit_price, 2);
    v_discount := v_discount + v_item_discount;
  end loop;

  v_grand_total := v_subtotal - v_discount;
  if v_grand_total < 0 then raise exception 'Invoice total cannot be negative'; end if;

  update public.sales_invoices
  set subtotal = v_subtotal,
      discount_amount = v_discount,
      grand_total = v_grand_total
  where id = v_invoice.id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke execute on function public.create_sales_invoice(jsonb) from public;
revoke execute on function public.create_sales_invoice(jsonb) from anon;
grant execute on function public.create_sales_invoice(jsonb) to authenticated;
