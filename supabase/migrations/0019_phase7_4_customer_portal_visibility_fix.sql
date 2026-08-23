-- Phase 7.4 follow-up: make the customer portal independent of optional
-- permission-row state while preserving strict business/party boundaries.
-- This fixes portals that were provisioned before the catalog/order permission
-- rows were inserted and ensures customer ledger access follows the party.

-- Customer portal users may browse active products in their own business.
drop policy if exists "catalog members can view products" on public.products;
create policy "catalog members can view products"
on public.products
for select
to authenticated
using (
  business_id = public.current_business_id()
  and (
    public.current_user_role() in ('admin', 'staff')
    or (
      public.current_user_role() = 'user'
      and is_active = true
    )
    or (
      is_active = true
      and public.has_permission('catalog.view')
    )
  )
);

-- Ensure active customer portal profiles have an unambiguous party link.
do $$
declare
  v_profile record;
  v_party_id uuid;
  v_match_count integer;
begin
  for v_profile in
    select id, business_id, full_name, phone
    from public.profiles
    where role = 'user'
      and is_active = true
      and business_id is not null
      and party_id is null
  loop
    v_party_id := null;

    if v_profile.phone is not null then
      select count(*) into v_match_count
      from public.parties p
      where p.business_id = v_profile.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and p.phone = v_profile.phone;

      if v_match_count = 1 then
        select p.id into v_party_id
        from public.parties p
        where p.business_id = v_profile.business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and p.phone = v_profile.phone
        limit 1;
      end if;
    end if;

    if v_party_id is null then
      select count(*) into v_match_count
      from public.parties p
      where p.business_id = v_profile.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and lower(trim(p.name)) = lower(trim(v_profile.full_name));

      if v_match_count = 1 then
        select p.id into v_party_id
        from public.parties p
        where p.business_id = v_profile.business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and lower(trim(p.name)) = lower(trim(v_profile.full_name))
        limit 1;
      end if;
    end if;

    if v_party_id is not null then
      update public.profiles
      set party_id = v_party_id,
          updated_at = now()
      where id = v_profile.id;
    end if;
  end loop;
end;
$$;

-- Customer users can see invoices entered by themselves or by shop staff for
-- their linked party. No other customer's invoices become visible.
drop policy if exists "sales members can view permitted invoices" on public.sales_invoices;
create policy "sales members can view permitted invoices"
on public.sales_invoices
for select
to authenticated
using (
  business_id = public.current_business_id()
  and (
    public.has_permission('sales.view')
    or public.has_permission('sales.manage')
    or (
      public.current_user_role() = 'user'
      and (
        created_by = auth.uid()
        or party_id = (
          select p.party_id
          from public.profiles p
          where p.id = auth.uid()
            and p.is_active = true
          limit 1
        )
      )
    )
  )
);

drop policy if exists "sales members can view permitted invoice items" on public.sales_invoice_items;
create policy "sales members can view permitted invoice items"
on public.sales_invoice_items
for select
to authenticated
using (
  exists (
    select 1
    from public.sales_invoices i
    where i.id = invoice_id
      and i.business_id = public.current_business_id()
      and (
        public.has_permission('sales.view')
        or public.has_permission('sales.manage')
        or (
          public.current_user_role() = 'user'
          and (
            i.created_by = auth.uid()
            or i.party_id = (
              select p.party_id
              from public.profiles p
              where p.id = auth.uid()
                and p.is_active = true
              limit 1
            )
          )
        )
      )
  )
);

drop policy if exists "customer users can view own sale payments" on public.sale_payments;
create policy "customer users can view own sale payments"
on public.sale_payments
for select
to authenticated
using (
  business_id = public.current_business_id()
  and (
    public.current_user_role() in ('admin', 'staff')
    or (
      public.current_user_role() = 'user'
      and exists (
        select 1
        from public.sales_invoices i
        where i.id = sale_payments.invoice_id
          and i.business_id = public.current_business_id()
          and (
            i.created_by = auth.uid()
            or i.party_id = (
              select p.party_id
              from public.profiles p
              where p.id = auth.uid()
                and p.is_active = true
              limit 1
            )
          )
      )
    )
  )
);
