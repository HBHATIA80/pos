-- ============================================================
-- Phase 7.2.1
-- Sales transaction / RLS correction
--
-- Purpose:
--   Allow create_sales_invoice() to atomically create:
--     1. invoice header
--     2. invoice lines
--     3. totals
--     4. completed status when requested
--
-- Security:
--   - Function remains callable only by authenticated users.
--   - Function validates auth.uid()
--   - Function validates current_business_id()
--   - Function validates sales.manage permission
--   - Products and parties remain business-scoped.
--   - RLS remains enabled on both sales tables.
--   - We do NOT disable RLS.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Recreate create_sales_invoice as SECURITY DEFINER
-- ------------------------------------------------------------

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
  v_party_id uuid := nullif(payload->>'party_id', '')::uuid;

  v_quantity numeric;
  v_unit_price numeric;
  v_item_discount numeric;
  v_line_total numeric(14,2);
begin

  -- ----------------------------------------------------------
  -- 2. Authentication
  -- ----------------------------------------------------------

  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;


  -- ----------------------------------------------------------
  -- 3. Business context
  -- ----------------------------------------------------------

  if v_business_id is null then
    raise exception 'Business context not found';
  end if;


  -- ----------------------------------------------------------
  -- 4. Permission
  -- ----------------------------------------------------------

  if not public.has_permission('sales.manage') then
    raise exception 'Sales permission required';
  end if;


  -- ----------------------------------------------------------
  -- 5. Validate status
  -- ----------------------------------------------------------

  if v_status not in ('draft', 'completed') then
    raise exception 'Invalid sales status';
  end if;


  -- ----------------------------------------------------------
  -- 6. Validate customer / party
  -- ----------------------------------------------------------

  if v_party_id is not null then

    select *
    into v_party
    from public.parties
    where id = v_party_id
      and business_id = v_business_id
      and is_active = true;

    if not found then
      raise exception 'Customer not found or inactive';
    end if;

    if v_party.party_type not in ('customer', 'both') then
      raise exception 'Selected party is not a customer';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- 7. Validate items
  -- ----------------------------------------------------------

  if jsonb_typeof(coalesce(payload->'items', 'null')) <> 'array'
     or jsonb_array_length(payload->'items') = 0 then

    raise exception 'At least one product is required';

  end if;


  -- ----------------------------------------------------------
  -- 8. IMPORTANT
  --
  -- Always create the invoice initially as DRAFT.
  --
  -- Why?
  --
  -- sales_invoice_items RLS is intentionally designed to allow
  -- item creation only while the parent invoice is draft.
  --
  -- After all items and totals are inserted, the transaction
  -- is changed to completed if the caller requested completed.
  -- ----------------------------------------------------------

  insert into public.sales_invoices
  (
    business_id,
    invoice_no,
    party_id,
    status,
    notes,
    sold_at,
    completed_at,
    created_by
  )
  values
  (
    v_business_id,

    'SI-' ||
      lpad(
        nextval('public.sales_invoice_number_seq')::text,
        8,
        '0'
      ),

    v_party_id,

    'draft',

    nullif(trim(payload->>'notes'), ''),

    null,

    null,

    v_user_id
  )
  returning *
  into v_invoice;


  -- ----------------------------------------------------------
  -- 9. Insert invoice lines
  -- ----------------------------------------------------------

  for v_item in
    select *
    from jsonb_array_elements(payload->'items')
  loop

    -- --------------------------------------------------------
    -- Product must belong to current business
    -- --------------------------------------------------------

    select p.*
    into v_product
    from public.products p
    where p.id = nullif(v_item->>'product_id', '')::uuid
      and p.business_id = v_business_id
      and p.is_active = true;

    if not found then
      raise exception 'Product not found or inactive';
    end if;


    -- --------------------------------------------------------
    -- Values supplied by POS
    -- --------------------------------------------------------

    v_quantity :=
      coalesce(
        (v_item->>'quantity')::numeric,
        0
      );

    v_unit_price :=
      coalesce(
        (v_item->>'unit_price')::numeric,
        -1
      );

    v_item_discount :=
      coalesce(
        (v_item->>'discount_amount')::numeric,
        0
      );


    -- --------------------------------------------------------
    -- Validation
    -- --------------------------------------------------------

    if v_quantity <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    if v_unit_price < 0 then
      raise exception 'Unit price cannot be negative';
    end if;

    if v_item_discount < 0 then
      raise exception 'Discount cannot be negative';
    end if;


    -- --------------------------------------------------------
    -- Calculate line total server-side
    -- --------------------------------------------------------

    v_line_total :=
      round(
        (v_quantity * v_unit_price) - v_item_discount,
        2
      );


    if v_line_total < 0 then
      raise exception 'Discount cannot exceed the line value';
    end if;


    -- --------------------------------------------------------
    -- Insert historical product snapshot
    -- --------------------------------------------------------

    insert into public.sales_invoice_items
    (
      invoice_id,
      product_id,
      sku,
      product_name,
      unit_name,
      quantity,
      unit_price,
      discount_amount,
      line_total
    )
    values
    (
      v_invoice.id,
      v_product.id,
      v_product.sku,
      v_product.name,

      coalesce(
        (
          select short_name
          from public.catalog_units
          where id = v_product.unit_id
        ),
        'unit'
      ),

      v_quantity,
      v_unit_price,
      v_item_discount,
      v_line_total
    );


    -- --------------------------------------------------------
    -- Invoice totals
    -- --------------------------------------------------------

    v_subtotal :=
      v_subtotal +
      round(
        v_quantity * v_unit_price,
        2
      );

    v_discount :=
      v_discount +
      v_item_discount;

  end loop;


  -- ----------------------------------------------------------
  -- 10. Calculate invoice total
  -- ----------------------------------------------------------

  v_grand_total :=
    v_subtotal - v_discount;


  if v_grand_total < 0 then
    raise exception 'Invoice total cannot be negative';
  end if;


  -- ----------------------------------------------------------
  -- 11. Update invoice totals
  -- ----------------------------------------------------------

  update public.sales_invoices
  set
    subtotal = v_subtotal,
    discount_amount = v_discount,
    grand_total = v_grand_total
  where id = v_invoice.id
  returning *
  into v_invoice;


  -- ----------------------------------------------------------
  -- 12. Complete only AFTER all lines have been inserted
  -- ----------------------------------------------------------

  if v_status = 'completed' then

    update public.sales_invoices
    set
      status = 'completed',
      sold_at = now(),
      completed_at = now()
    where id = v_invoice.id
    returning *
    into v_invoice;

  end if;


  -- ----------------------------------------------------------
  -- 13. Return invoice
  -- ----------------------------------------------------------

  return v_invoice;

end;
$$;


-- ------------------------------------------------------------
-- 14. Restrict function execution
-- ------------------------------------------------------------

revoke execute
on function public.create_sales_invoice(jsonb)
from public;

revoke execute
on function public.create_sales_invoice(jsonb)
from anon;

grant execute
on function public.create_sales_invoice(jsonb)
to authenticated;


-- ------------------------------------------------------------
-- 15. Keep RLS enabled
-- ------------------------------------------------------------

alter table public.sales_invoices
enable row level security;

alter table public.sales_invoice_items
enable row level security;


-- ------------------------------------------------------------
-- 16. Documentation
-- ------------------------------------------------------------

comment on function public.create_sales_invoice(jsonb)
is
'Creates a sales invoice atomically. Invoice lines are inserted while the invoice is draft; the invoice is completed only after all lines and totals have been successfully created.';