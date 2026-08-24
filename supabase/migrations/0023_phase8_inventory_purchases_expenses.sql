-- Phase 8: purchasing, stock movements and expenses.
-- No GST/tax. Purchases increase stock; completed sales decrease stock.
create sequence if not exists public.purchase_invoice_number_seq;
create sequence if not exists public.expense_number_seq;

create table if not exists public.purchase_invoices (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 invoice_no text not null unique, party_id uuid references public.parties(id) on delete restrict,
 status text not null default 'draft' check (status in ('draft','completed','void')),
 subtotal numeric(14,2) not null default 0, discount_amount numeric(14,2) not null default 0, grand_total numeric(14,2) not null default 0,
 notes text, purchased_at timestamptz, completed_at timestamptz, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint purchase_total_check check (grand_total=subtotal-discount_amount)
);
create table if not exists public.purchase_invoice_items (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete restrict, sku text not null, product_name text not null, unit_name text not null,
 quantity numeric(14,3) not null check(quantity>0), unit_price numeric(14,2) not null check(unit_price>=0), discount_amount numeric(14,2) not null default 0 check(discount_amount>=0),
 line_total numeric(14,2) not null, created_at timestamptz not null default now(), constraint purchase_item_total_check check(line_total=round((quantity*unit_price)-discount_amount,2))
);
create table if not exists public.stock_movements (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete restrict, movement_type text not null check(movement_type in ('opening','purchase','sale','sale_void','purchase_void','adjustment_in','adjustment_out')),
 quantity numeric(14,3) not null check(quantity>0), reference_type text, reference_id uuid, notes text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 expense_no text not null unique, category text not null, description text not null, amount numeric(14,2) not null check(amount>0), payment_method text not null default 'cash',
 reference_no text, expense_date timestamptz not null default now(), notes text, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists purchase_business_date_idx on public.purchase_invoices(business_id,created_at desc);
create index if not exists stock_business_product_date_idx on public.stock_movements(business_id,product_id,created_at desc);
create index if not exists expenses_business_date_idx on public.expenses(business_id,expense_date desc);

create or replace function public.apply_stock_movement(p_product_id uuid,p_business_id uuid,p_delta numeric,p_type text,p_reference_type text,p_reference_id uuid,p_notes text) returns void language plpgsql security definer set search_path=public as $$
declare v_stock numeric; begin select current_stock into v_stock from public.products where id=p_product_id and business_id=p_business_id and is_active for update; if not found then raise exception 'Product not found'; end if; if p_delta<0 and v_stock+p_delta<0 then raise exception 'Insufficient stock for product'; end if; update public.products set current_stock=current_stock+p_delta,updated_at=now() where id=p_product_id; insert into public.stock_movements(business_id,product_id,movement_type,quantity,reference_type,reference_id,notes,created_by) values(p_business_id,p_product_id,p_type,abs(p_delta),p_reference_type,p_reference_id,p_notes,auth.uid()); end; $$;
grant execute on function public.apply_stock_movement(uuid,uuid,numeric,text,text,uuid,text) to authenticated;

create or replace function public.purchase_stock_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare r record; begin if old.status is distinct from new.status then if new.status='completed' and old.status='draft' then for r in select product_id,quantity from public.purchase_invoice_items where invoice_id=new.id loop perform public.apply_stock_movement(r.product_id,new.business_id,r.quantity,'purchase','purchase',new.id,'Purchase completed'); end loop; elsif new.status='void' and old.status='completed' then for r in select product_id,quantity from public.purchase_invoice_items where invoice_id=new.id loop perform public.apply_stock_movement(r.product_id,new.business_id,-r.quantity,'purchase_void','purchase',new.id,'Purchase voided'); end loop; end if; end if; return new; end; $$;
drop trigger if exists trg_purchase_stock on public.purchase_invoices; create trigger trg_purchase_stock after update on public.purchase_invoices for each row execute function public.purchase_stock_trigger();
create or replace function public.sales_stock_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare r record; begin if old.status is distinct from new.status then if new.status='completed' and old.status='draft' then for r in select product_id,quantity from public.sales_invoice_items where invoice_id=new.id loop perform public.apply_stock_movement(r.product_id,new.business_id,-r.quantity,'sale','sale',new.id,'Sale completed'); end loop; elsif new.status='void' and old.status='completed' then for r in select product_id,quantity from public.sales_invoice_items where invoice_id=new.id loop perform public.apply_stock_movement(r.product_id,new.business_id,r.quantity,'sale_void','sale',new.id,'Sale voided'); end loop; end if; end if; return new; end; $$;
drop trigger if exists trg_sales_stock on public.sales_invoices; create trigger trg_sales_stock after update on public.sales_invoices for each row execute function public.sales_stock_trigger();

alter table public.purchase_invoices enable row level security; alter table public.purchase_invoice_items enable row level security; alter table public.stock_movements enable row level security; alter table public.expenses enable row level security;
create policy purchase_view on public.purchase_invoices for select to authenticated using(business_id=public.current_business_id());
create policy purchase_insert on public.purchase_invoices for insert to authenticated with check(business_id=public.current_business_id() and public.has_permission('purchase.manage'));
create policy purchase_update on public.purchase_invoices for update to authenticated using(business_id=public.current_business_id() and public.has_permission('purchase.manage')) with check(business_id=public.current_business_id());
create policy purchase_items_view on public.purchase_invoice_items for select to authenticated using(exists(select 1 from public.purchase_invoices p where p.id=invoice_id and p.business_id=public.current_business_id()));
create policy purchase_items_insert on public.purchase_invoice_items for insert to authenticated with check(public.has_permission('purchase.manage') and exists(select 1 from public.purchase_invoices p where p.id=invoice_id and p.business_id=public.current_business_id() and p.status='draft'));
create policy stock_view on public.stock_movements for select to authenticated using(business_id=public.current_business_id());
create policy expenses_view on public.expenses for select to authenticated using(business_id=public.current_business_id());
create policy expenses_insert on public.expenses for insert to authenticated with check(business_id=public.current_business_id() and public.has_permission('expenses.manage'));
create policy expenses_update on public.expenses for update to authenticated using(business_id=public.current_business_id() and public.has_permission('expenses.manage')) with check(business_id=public.current_business_id());

create or replace function public.create_purchase_invoice(payload jsonb) returns public.purchase_invoices language plpgsql security definer set search_path=public as $$
declare v_business uuid:=public.current_business_id(); v_user uuid:=auth.uid(); v_invoice public.purchase_invoices; v_item jsonb; v_product public.products; v_party public.parties; v_sub numeric:=0; v_disc numeric:=0; v_qty numeric; v_price numeric; v_idisc numeric; v_line numeric; v_party_id uuid:=nullif(payload->>'party_id','')::uuid; begin
if v_business is null or v_user is null or not public.has_permission('purchase.manage') then raise exception 'Purchase permission required'; end if;
if jsonb_typeof(coalesce(payload->'items','null'))<>'array' or jsonb_array_length(payload->'items')=0 then raise exception 'At least one product is required'; end if;
if v_party_id is not null then select * into v_party from public.parties where id=v_party_id and business_id=v_business and is_active and party_type in('supplier','both'); if not found then raise exception 'Supplier not found or inactive'; end if; end if;
insert into public.purchase_invoices(business_id,invoice_no,party_id,status,notes,created_by) values(v_business,'PI-'||lpad(nextval('public.purchase_invoice_number_seq')::text,8,'0'),v_party_id,'draft',nullif(trim(payload->>'notes'),''),v_user) returning * into v_invoice;
for v_item in select * from jsonb_array_elements(payload->'items') loop select * into v_product from public.products where id=nullif(v_item->>'product_id','')::uuid and business_id=v_business and is_active; if not found then raise exception 'Product not found or inactive'; end if; v_qty:=coalesce((v_item->>'quantity')::numeric,0); v_price:=coalesce((v_item->>'unit_price')::numeric,-1); v_idisc:=coalesce((v_item->>'discount_amount')::numeric,0); v_line:=round(v_qty*v_price-v_idisc,2); if v_qty<=0 or v_price<0 or v_idisc<0 or v_line<0 then raise exception 'Invalid purchase line'; end if; insert into public.purchase_invoice_items(invoice_id,product_id,sku,product_name,unit_name,quantity,unit_price,discount_amount,line_total) values(v_invoice.id,v_product.id,v_product.sku,v_product.name,coalesce((select short_name from public.catalog_units where id=v_product.unit_id),'unit'),v_qty,v_price,v_idisc,v_line); v_sub:=v_sub+round(v_qty*v_price,2); v_disc:=v_disc+v_idisc; end loop;
update public.purchase_invoices set subtotal=v_sub,discount_amount=v_disc,grand_total=v_sub-v_disc where id=v_invoice.id returning * into v_invoice; return v_invoice; end; $$;
grant execute on function public.create_purchase_invoice(jsonb) to authenticated;
create or replace function public.complete_purchase_invoice(p_invoice_id uuid) returns public.purchase_invoices language plpgsql security definer set search_path=public as $$ declare v public.purchase_invoices; begin if not public.has_permission('purchase.manage') then raise exception 'Purchase permission required'; end if; select * into v from public.purchase_invoices where id=p_invoice_id and business_id=public.current_business_id() for update; if not found or v.status<>'draft' then raise exception 'Only draft purchase invoices can be completed'; end if; if not exists(select 1 from public.purchase_invoice_items where invoice_id=v.id) then raise exception 'Purchase has no items'; end if; update public.purchase_invoices set status='completed',purchased_at=now(),completed_at=now() where id=v.id returning * into v; return v; end; $$;
grant execute on function public.complete_purchase_invoice(uuid) to authenticated;
create or replace function public.create_expense(payload jsonb) returns public.expenses language plpgsql security definer set search_path=public as $$ declare v public.expenses; begin if not public.has_permission('expenses.manage') then raise exception 'Expense permission required'; end if; insert into public.expenses(business_id,expense_no,category,description,amount,payment_method,reference_no,expense_date,notes,created_by) values(public.current_business_id(),'EX-'||lpad(nextval('public.expense_number_seq')::text,8,'0'),trim(payload->>'category'),trim(payload->>'description'),(payload->>'amount')::numeric,coalesce(nullif(payload->>'payment_method',''),'cash'),nullif(trim(payload->>'reference_no'),''),coalesce((payload->>'expense_date')::timestamptz,now()),nullif(trim(payload->>'notes'),''),auth.uid()) returning * into v; return v; end; $$;
grant execute on function public.create_expense(jsonb) to authenticated;
