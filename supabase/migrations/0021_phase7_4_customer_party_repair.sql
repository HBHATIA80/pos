-- Phase 7.4 follow-up: deterministic customer-party repair.
--
-- Older customer accounts could have a missing or incorrect party_id. Portal
-- orders created before party linking also have party_id = null. Repair those
-- records using the strongest available identity: email, normalized phone,
-- then normalized name. If no customer party exists, create one for the
-- authenticated customer's business.

do $$
declare
  v_profile record;
  v_user_email text;
  v_party_id uuid;
  v_match_count integer;
begin
  for v_profile in
    select p.id, p.business_id, p.full_name, p.phone, p.party_id, u.email
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.role = 'user'
      and p.is_active = true
      and p.business_id is not null
  loop
    v_user_email := lower(trim(coalesce(v_profile.email, '')));
    v_party_id := null;

    -- 1. Email is the strongest match when the party has an email.
    if v_user_email <> '' then
      select count(*) into v_match_count
      from public.parties p
      where p.business_id = v_profile.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and lower(trim(coalesce(p.email, ''))) = v_user_email;

      if v_match_count = 1 then
        select p.id into v_party_id
        from public.parties p
        where p.business_id = v_profile.business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and lower(trim(coalesce(p.email, ''))) = v_user_email
        limit 1;
      end if;
    end if;

    -- 2. Normalized phone is the next strongest match.
    if v_party_id is null and nullif(trim(v_profile.phone), '') is not null then
      select count(*) into v_match_count
      from public.parties p
      where p.business_id = v_profile.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_profile.phone, '[^0-9]', '', 'g')
        and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') <> '';

      if v_match_count = 1 then
        select p.id into v_party_id
        from public.parties p
        where p.business_id = v_profile.business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace(v_profile.phone, '[^0-9]', '', 'g')
          and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') <> ''
        limit 1;
      end if;
    end if;

    -- 3. Exact normalized name match.
    if v_party_id is null and nullif(trim(v_profile.full_name), '') is not null then
      select count(*) into v_match_count
      from public.parties p
      where p.business_id = v_profile.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(v_profile.full_name), '\s+', ' ', 'g'));

      if v_match_count = 1 then
        select p.id into v_party_id
        from public.parties p
        where p.business_id = v_profile.business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(v_profile.full_name), '\s+', ' ', 'g'))
        limit 1;
      end if;
    end if;

    -- 4. If there is no party at all, create the customer party now.
    if v_party_id is null then
      insert into public.parties (
        business_id,
        party_type,
        name,
        phone,
        email,
        is_active,
        created_by
      )
      values (
        v_profile.business_id,
        'customer',
        coalesce(nullif(trim(v_profile.full_name), ''), 'Customer'),
        nullif(trim(v_profile.phone), ''),
        nullif(trim(v_profile.email), ''),
        true,
        v_profile.id
      )
      returning id into v_party_id;
    end if;

    -- Always repair the profile link if it differs from the resolved party.
    update public.profiles
    set party_id = v_party_id,
        updated_at = now()
    where id = v_profile.id
      and (party_id is distinct from v_party_id);

    -- Legacy customer portal orders were deliberately created without party_id.
    -- Link them to the repaired customer party so staff-entered and customer-
    -- entered transactions share one customer ledger.
    update public.sales_invoices i
    set party_id = v_party_id
    where i.created_by = v_profile.id
      and i.business_id = v_profile.business_id
      and i.order_channel = 'customer_portal'
      and i.party_id is null;
  end loop;
end;
$$;

create index if not exists profiles_business_party_idx
  on public.profiles (business_id, party_id)
  where party_id is not null;

create index if not exists sales_invoices_business_party_idx
  on public.sales_invoices (business_id, party_id, created_at desc)
  where party_id is not null;
