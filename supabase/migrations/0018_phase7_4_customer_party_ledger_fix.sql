-- Phase 7.4: bind customer portal users to parties and make the customer ledger party-based.
--
-- A customer's ledger must follow the customer/party, not the user who happened
-- to create an invoice. This allows POS sales entered by admin/staff and orders
-- placed from the customer portal to appear in the same customer's ledger.

alter table public.profiles
  add column if not exists party_id uuid references public.parties(id) on delete set null;

create index if not exists profiles_business_party_idx
  on public.profiles (business_id, party_id)
  where party_id is not null;

-- Portal users must not be able to choose/change their own party link. The
-- system-owned trigger below is the only path that assigns it.
revoke update (party_id)
on public.profiles
from authenticated, anon;

-- Backfill portal users to an unambiguous existing customer party.
-- Prefer phone, then exact normalized name. If either value matches multiple
-- parties, leave the profile unlinked rather than guessing the customer.
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
      select count(*)
      into v_match_count
      from public.parties p
      where p.business_id = v_profile.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and p.phone = v_profile.phone;

      if v_match_count = 1 then
        select p.id
        into v_party_id
        from public.parties p
        where p.business_id = v_profile.business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and p.phone = v_profile.phone
        limit 1;
      end if;
    end if;

    if v_party_id is null then
      select count(*)
      into v_match_count
      from public.parties p
      where p.business_id = v_profile.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and lower(trim(p.name)) = lower(trim(v_profile.full_name));

      if v_match_count = 1 then
        select p.id
        into v_party_id
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

-- Attach existing customer-portal invoices to the same party as their portal user.
update public.sales_invoices i
set party_id = p.party_id
from public.profiles p
where i.created_by = p.id
  and i.business_id = p.business_id
  and i.order_channel = 'customer_portal'
  and i.party_id is null
  and p.role = 'user'
  and p.party_id is not null;

-- Future customer orders always inherit the portal user's party. If the profile
-- is not linked yet, this trigger uses an unambiguous phone/name match or creates
-- a new customer party and permanently links the profile to it.
create or replace function public.assign_customer_order_party()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_party_id uuid;
  v_match_count integer;
begin
  if coalesce(new.order_channel, '') <> 'customer_portal' or new.party_id is not null then
    return new;
  end if;

  select p.*
  into v_profile
  from public.profiles p
  where p.id = new.created_by
    and p.business_id = new.business_id
    and p.role = 'user'
    and p.is_active = true;

  if not found then
    return new;
  end if;

  v_party_id := v_profile.party_id;

  if v_party_id is null and v_profile.phone is not null then
    select count(*)
    into v_match_count
    from public.parties p
    where p.business_id = new.business_id
      and p.party_type in ('customer', 'both')
      and p.is_active = true
      and p.phone = v_profile.phone;

    if v_match_count = 1 then
      select p.id
      into v_party_id
      from public.parties p
      where p.business_id = new.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and p.phone = v_profile.phone
      limit 1;
    end if;
  end if;

  if v_party_id is null then
    select count(*)
    into v_match_count
    from public.parties p
    where p.business_id = new.business_id
      and p.party_type in ('customer', 'both')
      and p.is_active = true
      and lower(trim(p.name)) = lower(trim(v_profile.full_name));

    if v_match_count = 1 then
      select p.id
      into v_party_id
      from public.parties p
      where p.business_id = new.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and lower(trim(p.name)) = lower(trim(v_profile.full_name))
      limit 1;
    end if;
  end if;

  if v_party_id is null then
    insert into public.parties (
      business_id,
      party_type,
      name,
      phone,
      created_by
    )
    values (
      new.business_id,
      'customer',
      trim(v_profile.full_name),
      nullif(trim(v_profile.phone), ''),
      new.created_by
    )
    returning id into v_party_id;
  end if;

  update public.profiles
  set party_id = v_party_id,
      updated_at = now()
  where id = v_profile.id
    and (party_id is null or party_id = v_party_id);

  new.party_id := v_party_id;
  return new;
end;
$$;

drop trigger if exists sales_invoices_assign_customer_party on public.sales_invoices;

create trigger sales_invoices_assign_customer_party
before insert on public.sales_invoices
for each row
execute function public.assign_customer_order_party();

revoke execute on function public.assign_customer_order_party() from public, anon, authenticated;

-- Customer portal users may read invoices and invoice lines for their linked
-- party, regardless of whether the invoice was entered by the customer or by
-- admin/staff. They still cannot see other customers' invoices.
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
      public.has_permission('orders.place')
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

-- Apply the same party boundary to invoice lines.
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
          public.has_permission('orders.place')
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

-- Payments follow the invoice's party as well, so staff-entered payments for
-- this customer are visible in the customer's ledger.
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
);

comment on column public.profiles.party_id is
'Customer portal party link. Customer ledger ownership follows this party, not created_by.';

comment on function public.assign_customer_order_party() is
'Binds customer portal orders to the authenticated customer party before invoice insertion.';
