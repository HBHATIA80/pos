-- Phase 5 follow-up: ordinary users may browse only currently available products.
-- Admin/staff retain access to the complete business catalog.

drop policy if exists "business members can view products" on public.products;

create policy "business members can view available products"
on public.products for select
to authenticated
using (
  business_id = public.current_business_id()
  and (
    public.current_user_role() in ('admin', 'staff')
    or is_active = true
  )
);
