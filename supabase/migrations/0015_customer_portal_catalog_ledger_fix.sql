-- Customer portal catalog + ledger hardening.
-- Customers are authorized per active shop membership, not only by the
-- profile's current business pointer. Customer orders are also tied to the
-- shop-specific Party so shop-entered invoices and payments appear in the
-- customer's ledger.

insert into public.permissions (code, name, module, description, sort_order)
values
  ('orders.place', 'Place orders', 'orders', 'Place product orders from the customer portal.', 85)
on conflict (code) do nothing;

insert into public.profile_permissions (profile_id, permission_id)
select p.id, perm.id
from public.profiles p
cross join public.permissions perm
where p.role = 'user'
  and p.is_active = true
  and perm.code in ('catalog.view', 'orders.place')
  and not exists (
    select 1
    from public.profile_permissions pp
    where pp.profile_id = p.id
      and pp.permission_id = perm.id
  );

-- A customer may browse active products for every shop they are actively
-- connected to. Admin/staff keep their normal business-scoped access.
drop policy if exists "catalog members can view products" on public.products;
drop policy if exists "customer members can view active products" on public.products;

create policy "catalog members can view products"
on public.products for select
to authenticated
using (
  (
    business_id = public.current_business_id()
    and (
      public.current_user_role() in ('admin', 'staff')
      or (is_active = true and public.has_permission('catalog.view'))
    )
  )
  or (
    is_active = true
    and public.current_user_role() = 'user'
    and exists (
      select 1
      from public.customer_business_memberships m
      where m.user_id = auth.uid()
        and m.business_id = products.business_id
        and m.is_active = true
    )
  )
);

-- Ensure the customer order is linked to the Party created for that specific
-- shop membership. This makes later shop invoices/payments part of the same
-- customer/shop ledger.
create or replace function public.create_sales_invoice(payload jsonb)
returns public.sales_invoices
language plpgsql
security invoker
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
  if v_business_id is null or v_user_id is null then raise exception 'Unauthorized'; end if;
  if not public.has_permission('sales.manage') and not public.has_permission('orders.place') then raise exception 'Sales permission required'; end if;

  v_is_order := public.has_permission('orders.place') and not public.has_permission('sales.manage');
  if v_is_order then
    v_status := 'draft';
    select m.party_id into v_party_id
    from public.customer_business_memberships m
    where m.user_id = v_user_id
      and m.business_id = v_business_id
      and m.is_active = true
    order by m.is_primary desc, m.joined_at asc
    limit 1;
    if v_party_id is null then raise exception 'Customer is not connected to this shop'; end if;
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

  insert into public.sales_invoices (business_id, invoice_no, party_id, status, notes, sold_at, completed_at, created_by)
  values (
    v_business_id,
    'SI-' || lpad(nextval('public.sales_invoice_number_seq')::text, 8, '0'),
    v_party_id,
    v_status,
    nullif(trim(payload->>'notes'), ''),
    case when v_status = 'completed' then now() else null end,
    case when v_status = 'completed' then now() else null end,
    v_user_id
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

comment on function public.create_sales_invoice(jsonb)
is 'Creates business sales invoices for managers and draft customer orders for users; customer orders use the current product sale price and the customer membership party.';
