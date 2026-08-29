create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
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
  v_full_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'New User'));
  v_account_type := lower(trim(coalesce(new.raw_user_meta_data ->> 'account_type', 'shop_admin')));

  if v_account_type in ('staff', 'user') then
    v_business_id := nullif(trim(new.raw_user_meta_data ->> 'business_id'), '')::uuid;
    if v_business_id is null then
      raise exception 'A business is required for staff or customer accounts';
    end if;

    if not exists (select 1 from public.businesses where id = v_business_id and status = 'active') then
      raise exception 'Invalid or inactive business for staff or customer account';
    end if;

    insert into public.profiles (id, business_id, role, full_name, phone)
    values (new.id, v_business_id, v_account_type::user_role, v_full_name, new.phone);

    return new;
  end if;

  if v_account_type = 'customer' then
    v_business_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'business_code', '')));
    if v_business_code = '' then raise exception 'A shop code is required for customer signup'; end if;

    select id into v_business_id
    from public.businesses
    where status = 'active' and lower(trim(code)) = lower(v_business_code)
    limit 1;
    if v_business_id is null then raise exception 'Invalid or inactive shop code'; end if;

    insert into public.profiles (id, business_id, role, full_name, phone)
    values (new.id, v_business_id, 'user', v_full_name, new.phone);

    if nullif(trim(new.phone), '') is not null then
      select count(*) into v_match_count from public.parties p
      where p.business_id = v_business_id and p.party_type in ('customer','both') and p.is_active = true
        and regexp_replace(coalesce(p.phone,''), '[^0-9]', '', 'g') = regexp_replace(new.phone, '[^0-9]', '', 'g')
        and regexp_replace(coalesce(p.phone,''), '[^0-9]', '', 'g') <> '';
      if v_match_count = 1 then
        select p.id into v_party_id from public.parties p
        where p.business_id = v_business_id and p.party_type in ('customer','both') and p.is_active = true
          and regexp_replace(coalesce(p.phone,''), '[^0-9]', '', 'g') = regexp_replace(new.phone, '[^0-9]', '', 'g')
          and regexp_replace(coalesce(p.phone,''), '[^0-9]', '', 'g') <> '' limit 1;
      end if;
    end if;

    if v_party_id is null then
      select count(*) into v_match_count from public.parties p
      where p.business_id = v_business_id and p.party_type in ('customer','both') and p.is_active = true
        and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(v_full_name), '\s+', ' ', 'g'));
      if v_match_count = 1 then
        select p.id into v_party_id from public.parties p
        where p.business_id = v_business_id and p.party_type in ('customer','both') and p.is_active = true
          and lower(regexp_replace(trim(p.name), '\s+', ' ', 'g')) = lower(regexp_replace(trim(v_full_name), '\s+', ' ', 'g')) limit 1;
      end if;
    end if;

    if v_party_id is null then
      insert into public.parties (business_id, party_type, name, phone, created_by)
      values (v_business_id, 'customer', v_full_name, nullif(trim(new.phone), ''), new.id)
      returning id into v_party_id;
    end if;

    update public.profiles set party_id = v_party_id, updated_at = now() where id = new.id;

    insert into public.customer_business_memberships (user_id, business_id, party_id, is_primary)
    values (new.id, v_business_id, v_party_id, true)
    on conflict (user_id, business_id) do update
      set party_id = excluded.party_id, is_active = true, is_primary = true, updated_at = now();

    return new;
  end if;

  v_business_name := trim(coalesce(new.raw_user_meta_data ->> 'business_name', v_full_name || '''s Shop'));
  v_business_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'business_phone', new.phone)), '');

  insert into public.businesses (name, phone, created_by)
  values (v_business_name, v_business_phone, new.id)
  returning id into v_business_id;

  update public.businesses
  set code = 'SHOP-' || upper(substr(replace(v_business_id::text, '-', ''), 1, 8))
  where id = v_business_id and nullif(trim(code), '') is null;

  insert into public.profiles (id, business_id, role, full_name, phone)
  values (new.id, v_business_id, 'admin', v_full_name, new.phone);

  return new;
end;
$function$;
