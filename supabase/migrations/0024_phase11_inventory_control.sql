-- Phase 11: inventory control and stock reconciliation.
insert into public.permissions (code, name, module, description, sort_order)
values
 ('inventory.view', 'View inventory', 'inventory', 'View inventory and stock movements', 70),
 ('inventory.manage', 'Manage inventory adjustments', 'inventory', 'Create manual stock adjustments', 71)
on conflict (code) do nothing;

create index if not exists stock_movements_business_created_idx
on public.stock_movements (business_id, created_at desc);

create or replace function public.adjust_stock(payload jsonb)
returns public.stock_movements
language plpgsql
security definer
set search_path=public
as $$
declare
  v_business uuid := public.current_business_id();
  v_product uuid := nullif(payload->>'product_id','')::uuid;
  v_quantity numeric := coalesce((payload->>'quantity')::numeric,0);
  v_direction text := lower(coalesce(payload->>'direction',''));
  v_delta numeric;
  v_type text;
  v_movement public.stock_movements;
begin
  if v_business is null or auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not public.has_permission('inventory.manage') then raise exception 'Inventory permission required'; end if;
  if v_product is null or v_quantity <= 0 then raise exception 'Product and positive quantity are required'; end if;
  if v_direction not in ('in','out') then raise exception 'Direction must be in or out'; end if;
  if v_direction = 'in' then v_delta := v_quantity; v_type := 'adjustment_in'; else v_delta := -v_quantity; v_type := 'adjustment_out'; end if;
  perform public.apply_stock_movement(v_product, v_business, v_delta, v_type, 'adjustment', null, nullif(trim(payload->>'notes'),''));
  select * into v_movement from public.stock_movements where business_id=v_business and product_id=v_product and movement_type=v_type and reference_type='adjustment' and created_by=auth.uid() order by created_at desc, id desc limit 1;
  return v_movement;
end;
$$;

grant execute on function public.adjust_stock(jsonb) to authenticated;
comment on table public.stock_movements is 'Auditable inventory movements. Phase 11 adds controlled manual adjustments; sales and purchases remain transaction-driven.';
