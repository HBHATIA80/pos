-- Phase 7.5: explicit customer signup.
-- Public /signup remains a shop-owner signup and creates an admin.
-- Customer signup supplies a shop code and creates a user profile in that
-- existing business instead of creating a new business/admin account.

-- Give existing businesses a stable join code when they do not already have one.
update public.businesses
set code = 'SHOP-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where nullif(trim(code), '') is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_full_name text;
  v_business_name text;
  v_business_phone text;
  v_account_type text;
  v_business_code text;
  v_party_id uuid;
  v_match_count integer;
begin
  v_full_name := trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    'New User'
  ));

  v_account_type := lower(trim(coalesce(new.raw_user_meta_data ->> 'account_type', 'shop_admin')));

  -- Customer signup must join an existing shop. It never creates a business
  -- and can never receive the admin role through this path.
  if v_account_type = 'customer' then
    v_business_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'business_code', '')));

    if v_business_code = '' then
      raise exception 'A shop code is required for customer signup';
    end if;

    select id into v_business_id
    from public.businesses
    where status = 'active'
      and lower(trim(code)) = lower(v_business_code)
    limit 1;

    if v_business_id is null then
      raise exception 'Invalid or inactive shop code';
    end if;

    insert into public.profiles (id, business_id, role, full_name, phone)
    values (
      new.id,
      v_business_id,
      'user',
      v_full_name,
      new.phone
    );

    -- Link to the strongest unambiguous existing customer party.
    if nullif(trim(new.phone), '') is not null then
      select count(*) into v_match_count
      from public.parties p
      where p.business_id = v_business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace(new.phone, '[^0-9]', '', 'g')
        and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') <> '';

      if v_match_count = 1 then
        select p.id into v_party_id
        from public.parties p
        where p.business_id = v_business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace(new.phone, '[^0-9]', '', 'g')
          and regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') <> ''
        limit 1;
      end if;
    end if;

    if v_party_id is null then
      select count(*) into v_match_count
      from public.parties p
      where p.business_id = v_business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(v_full_name), '\s+', ' ', 'g'));

      if v_match_count = 1 then
        select p.id into v_party_id
        from public.parties p
        where p.business_id = v_business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(v_full_name), '\s+', ' ', 'g'))
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
        v_business_id,
        'customer',
        v_full_name,
        nullif(trim(new.phone), ''),
        new.id
      )
      returning id into v_party_id;
    end if;

    update public.profiles
    set party_id = v_party_id,
        updated_at = now()
    where id = new.id;

    return new;
  end if;

  -- Default/public shop signup: first account of a shop is the admin.
  v_business_name := trim(coalesce(
    new.raw_user_meta_data ->> 'business_name',
    v_full_name || '''s Shop'
  ));

  v_business_phone := nullif(trim(coalesce(
    new.raw_user_meta_data ->> 'business_phone',
    new.phone
  )), '');

  insert into public.businesses (name, phone, created_by)
  values (v_business_name, v_business_phone, new.id)
  returning id into v_business_id;

  update public.businesses
  set code = 'SHOP-' || upper(substr(replace(v_business_id::text, '-', ''), 1, 8))
  where id = v_business_id
    and nullif(trim(code), '') is null;

  insert into public.profiles (id, business_id, role, full_name, phone)
  values (
    new.id,
    v_business_id,
    'admin',
    v_full_name,
    new.phone
  );

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates shop admin profiles for shop signup and customer user profiles for customer signup with a valid shop code.';
