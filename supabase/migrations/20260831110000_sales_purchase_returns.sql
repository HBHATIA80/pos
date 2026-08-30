-- Sales Return / Purchase Return vouchers.
-- Returns are first-class accounting documents, never negative invoices.
-- Sale Return: stock increases; party is credited; Sales Return is debited.
-- Purchase Return: stock decreases; party is debited; Purchase Return is credited.

create sequence if not exists public.sale_return_number_seq;
create sequence if not exists public.purchase_return_number_seq;

create table if not exists public.return_vouchers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  return_no text not null,
  return_type text not null check (return_type in ('sale_return','purchase_return')),
  party_id uuid not null references public.parties(id) on delete restrict,
  source_invoice_id uuid,
  source_invoice_type text check (source_invoice_type is null or source_invoice_type in ('sale','purchase')),
  status text not null default 'completed' check (status in ('draft','completed','void')),
  return_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  reason text,
  notes text,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  void_journal_entry_id uuid references public.journal_entries(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, return_no),
  constraint return_source_pair_check check ((source_invoice_id is null and source_invoice_type is null) or (source_invoice_id is not null and source_invoice_type is not null)),
  constraint return_total_check check (grand_total = subtotal - discount_amount)
);

create table if not exists public.return_voucher_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_vouchers(id) on delete cascade,
  source_invoice_item_id uuid,
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null,
  product_name text not null,
  unit_name text not null,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  line_total numeric(14,2) not null,
  created_at timestamptz not null default now(),
  constraint return_item_total_check check (line_total = round((quantity * unit_price) - discount_amount, 2))
);

create index if not exists return_vouchers_business_date_idx on public.return_vouchers(business_id, return_date desc, created_at desc);
create index if not exists return_vouchers_business_party_idx on public.return_vouchers(business_id, party_id, return_date desc);
create index if not exists return_voucher_items_return_idx on public.return_voucher_items(return_id);

alter table public.return_vouchers enable row level security;
alter table public.return_voucher_items enable row level security;

drop policy if exists return_vouchers_view on public.return_vouchers;
create policy return_vouchers_view on public.return_vouchers for select to authenticated using (business_id = public.current_business_id());
drop policy if exists return_vouchers_insert on public.return_vouchers;
create policy return_vouchers_insert on public.return_vouchers for insert to authenticated with check (business_id = public.current_business_id() and (public.has_permission('sales.manage') or public.has_permission('purchase.manage')));
drop policy if exists return_voucher_items_view on public.return_voucher_items;
create policy return_voucher_items_view on public.return_voucher_items for select to authenticated using (exists (select 1 from public.return_vouchers r where r.id = return_id and r.business_id = public.current_business_id()));
drop policy if exists return_voucher_items_insert on public.return_voucher_items;
create policy return_voucher_items_insert on public.return_voucher_items for insert to authenticated with check (exists (select 1 from public.return_vouchers r where r.id = return_id and r.business_id = public.current_business_id() and r.status = 'draft'));

-- Extend the inventory movement vocabulary without changing historical rows.
alter table public.stock_movements drop constraint if exists stock_movements_movement_type_check;
alter table public.stock_movements add constraint stock_movements_movement_type_check check (movement_type in ('opening','purchase','sale','sale_void','purchase_void','sale_return','purchase_return','sale_return_void','purchase_return_void','adjustment_in','adjustment_out'));

-- Return accounts are contra accounts inside the existing Sales/Purchase groups.
insert into public.accounts (business_id, account_group_id, account_code, name, account_nature, is_party_account, is_system)
select b.id, ag.id, 'SYS_SALES_RETURN', 'Sales Return', 'income', false, true
from public.businesses b join public.account_groups ag on ag.business_id=b.id and ag.code='SALES'
on conflict (business_id, account_code) do nothing;
insert into public.accounts (business_id, account_group_id, account_code, name, account_nature, is_party_account, is_system)
select b.id, ag.id, 'SYS_PURCHASE_RETURN', 'Purchase Return', 'expense', false, true
from public.businesses b join public.account_groups ag on ag.business_id=b.id and ag.code='PURCHASE'
on conflict (business_id, account_code) do nothing;

create or replace function public.create_return_voucher(payload jsonb, p_return_date date, p_complete boolean default true)
returns public.return_vouchers
language plpgsql security definer set search_path=public as $$
declare
  v_business uuid := public.current_business_id();
  v_user uuid := auth.uid();
  v public.return_vouchers;
  v_item jsonb;
  v_party public.parties;
  v_product public.products;
  v_source_sale public.sales_invoices;
  v_source_purchase public.purchase_invoices;
  v_source_item_id uuid;
  v_qty numeric;
  v_price numeric;
  v_disc numeric;
  v_line numeric;
  v_sub numeric := 0;
  v_discount numeric := 0;
  v_return_type text := coalesce(payload->>'return_type','');
  v_party_id uuid := nullif(payload->>'party_id','')::uuid;
  v_source_id uuid := nullif(payload->>'source_invoice_id','')::uuid;
  v_source_type text := nullif(payload->>'source_invoice_type','');
  v_no text;
  v_permission text;
  v_account uuid;
  v_party_account uuid;
  v_journal uuid;
  v_source_qty numeric;
  v_returned_qty numeric;
begin
  if v_business is null or v_user is null then raise exception 'Authentication required'; end if;
  if v_return_type not in ('sale_return','purchase_return') then raise exception 'Invalid return type'; end if;
  v_permission := case when v_return_type='sale_return' then 'sales.manage' else 'purchase.manage' end;
  if not public.has_permission(v_permission) then raise exception 'Return permission required'; end if;
  if v_party_id is null then raise exception 'Party is required'; end if;
  select * into v_party from public.parties where id=v_party_id and business_id=v_business and is_active;
  if not found then raise exception 'Party not found or inactive'; end if;
  if p_return_date is null or p_return_date > current_date then raise exception 'Return date cannot be in the future'; end if;

  if v_source_id is not null then
    if v_return_type='sale_return' and v_source_type='sale' then
      select * into v_source_sale from public.sales_invoices where id=v_source_id and business_id=v_business and status='completed' and deleted_at is null and cancelled_at is null;
      if not found then raise exception 'Source sales invoice not found or not completed'; end if;
      if v_source_sale.party_id is distinct from v_party_id then raise exception 'Party does not match the source sales invoice'; end if;
    elsif v_return_type='purchase_return' and v_source_type='purchase' then
      select * into v_source_purchase from public.purchase_invoices where id=v_source_id and business_id=v_business and status='completed' and deleted_at is null and cancelled_at is null;
      if not found then raise exception 'Source purchase invoice not found or not completed'; end if;
      if v_source_purchase.party_id is distinct from v_party_id then raise exception 'Party does not match the source purchase invoice'; end if;
    else
      raise exception 'Source invoice type does not match return type';
    end if;
  elsif v_source_type is not null then
    raise exception 'Source invoice id is required when source invoice type is supplied';
  end if;

  if v_return_type='sale_return' then
    v_no := 'SR-'||lpad(nextval('public.sale_return_number_seq')::text,8,'0');
  else
    v_no := 'PR-'||lpad(nextval('public.purchase_return_number_seq')::text,8,'0');
  end if;

  insert into public.return_vouchers(business_id,return_no,return_type,party_id,source_invoice_id,source_invoice_type,status,return_date,reason,notes,created_by)
  values(v_business,v_no,v_return_type,v_party_id,v_source_id,v_source_type,case when p_complete then 'completed' else 'draft' end,p_return_date,nullif(trim(payload->>'reason'),''),nullif(trim(payload->>'notes'),''),v_user)
  returning * into v;

  if jsonb_typeof(coalesce(payload->'items','null'))<>'array' or jsonb_array_length(payload->'items')=0 then raise exception 'At least one return item is required'; end if;

  for v_item in select * from jsonb_array_elements(payload->'items') loop
    v_source_item_id := nullif(v_item->>'source_invoice_item_id','')::uuid;
    select * into v_product from public.products where id=nullif(v_item->>'product_id','')::uuid and business_id=v_business and is_active;
    if not found then raise exception 'Product not found or inactive'; end if;
    v_qty := coalesce((v_item->>'quantity')::numeric,0);
    v_price := coalesce((v_item->>'unit_price')::numeric,-1);
    v_disc := coalesce((v_item->>'discount_amount')::numeric,0);
    v_line := round(v_qty*v_price-v_disc,2);
    if v_qty<=0 or v_price<0 or v_disc<0 or v_line<0 then raise exception 'Invalid return line'; end if;

    if v_source_id is not null then
      if v_return_type='sale_return' then
        select quantity into v_source_qty from public.sales_invoice_items where id=v_source_item_id and invoice_id=v_source_id and product_id=v_product.id;
      else
        select quantity into v_source_qty from public.purchase_invoice_items where id=v_source_item_id and invoice_id=v_source_id and product_id=v_product.id;
      end if;
      if v_source_qty is null then raise exception 'Return item is not present on the source invoice'; end if;
      select coalesce(sum(i.quantity),0) into v_returned_qty
      from public.return_voucher_items i join public.return_vouchers r on r.id=i.return_id
      where r.source_invoice_id=v_source_id and r.return_type=v_return_type and r.status='completed' and i.source_invoice_item_id=v_source_item_id;
      if v_returned_qty + v_qty > v_source_qty then raise exception 'Return quantity exceeds the remaining quantity on the source invoice'; end if;
    end if;

    insert into public.return_voucher_items(return_id,source_invoice_item_id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total)
    values(v.id,v_source_item_id,v_product.id,v_product.sku,v_product.name,coalesce((select short_name from public.catalog_units where id=v_product.unit_id),'unit'),v_qty,v_price,v_disc,v_line);
    v_sub := v_sub + round(v_qty*v_price,2);
    v_discount := v_discount + v_disc;
  end loop;

  update public.return_vouchers set subtotal=v_sub,discount_amount=v_discount,grand_total=v_sub-v_discount,updated_at=now() where id=v.id returning * into v;

  if p_complete then
    for v_item in select to_jsonb(i) as item from public.return_voucher_items i where i.return_id=v.id loop
      if v_return_type='sale_return' then
        perform public.apply_stock_movement((v_item.item->>'product_id')::uuid,v_business,(v_item.item->>'quantity')::numeric,'sale_return','return',v.id,'Sale return completed');
      else
        perform public.apply_stock_movement((v_item.item->>'product_id')::uuid,v_business,-(v_item.item->>'quantity')::numeric,'purchase_return','return',v.id,'Purchase return completed');
      end if;
    end loop;

    select id into v_party_account from public.accounts where business_id=v_business and party_id=v_party_id and is_active limit 1;
    select id into v_account from public.accounts where business_id=v_business and account_code=case when v_return_type='sale_return' then 'SYS_SALES_RETURN' else 'SYS_PURCHASE_RETURN' end and is_active limit 1;
    if v_party_account is null or v_account is null then raise exception 'Required accounting account is missing for this party/return'; end if;
    if v_return_type='sale_return' then
      v_journal := public.post_accounting_entry(v_business,'sale_return',v.return_no,p_return_date::timestamptz,'Sale Return '||v.return_no,'return',v.id,v_user,v_account,v_party_account,v.grand_total,v_party_id);
    else
      v_journal := public.post_accounting_entry(v_business,'purchase_return',v.return_no,p_return_date::timestamptz,'Purchase Return '||v.return_no,'return',v.id,v_user,v_party_account,v_account,v.grand_total,v_party_id);
    end if;
    update public.return_vouchers set journal_entry_id=v_journal,updated_at=now() where id=v.id returning * into v;
  end if;
  return v;
exception when others then
  raise;
end;
$$;
grant execute on function public.create_return_voucher(jsonb,date,boolean) to authenticated;

create or replace function public.void_return_voucher(p_return_id uuid) returns public.return_vouchers language plpgsql security definer set search_path=public as $$
declare
  v public.return_vouchers;
  v_user uuid:=auth.uid();
  v_party_account uuid;
  v_account uuid;
  v_journal uuid;
  r record;
begin
  select * into v from public.return_vouchers where id=p_return_id and business_id=public.current_business_id() for update;
  if not found or v.status<>'completed' then raise exception 'Only completed return vouchers can be voided'; end if;
  if not public.has_permission(case when v.return_type='sale_return' then 'sales.manage' else 'purchase.manage' end) then raise exception 'Return permission required'; end if;

  for r in select product_id,quantity from public.return_voucher_items where return_id=v.id loop
    if v.return_type='sale_return' then
      perform public.apply_stock_movement(r.product_id,v.business_id,-r.quantity,'sale_return_void','return',v.id,'Sale return voided');
    else
      perform public.apply_stock_movement(r.product_id,v.business_id,r.quantity,'purchase_return_void','return',v.id,'Purchase return voided');
    end if;
  end loop;

  select id into v_party_account from public.accounts where business_id=v.business_id and party_id=v.party_id and is_active limit 1;
  select id into v_account from public.accounts where business_id=v.business_id and account_code=case when v.return_type='sale_return' then 'SYS_SALES_RETURN' else 'SYS_PURCHASE_RETURN' end and is_active limit 1;
  if v.return_type='sale_return' then
    v_journal := public.post_accounting_entry(v.business_id,'sale_return_void',v.return_no||'-VOID',v.return_date::timestamptz,'Void Sale Return '||v.return_no,'return_void',v.id,v_user,v_party_account,v_account,v.grand_total,v.party_id);
  else
    v_journal := public.post_accounting_entry(v.business_id,'purchase_return_void',v.return_no||'-VOID',v.return_date::timestamptz,'Void Purchase Return '||v.return_no,'return_void',v.id,v_user,v_account,v_party_account,v.grand_total,v.party_id);
  end if;
  update public.return_vouchers set status='void',void_journal_entry_id=v_journal,updated_at=now() where id=v.id returning * into v;
  return v;
end;
$$;
grant execute on function public.void_return_voucher(uuid) to authenticated;

comment on table public.return_vouchers is 'First-class Sale Return and Purchase Return vouchers. Never model returns as negative invoices.';
comment on column public.return_vouchers.return_date is 'Accounting/business date selected by the user, independent of entry timestamp.';
