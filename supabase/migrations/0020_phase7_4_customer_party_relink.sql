-- Phase 7.4 follow-up: relink customer portal profiles that were created
-- before their party existed. This is deliberately business-scoped and only
-- links an unambiguous active customer party.

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

    if nullif(trim(v_profile.phone), '') is not null then
      select count(*)
      into v_match_count
      from public.parties p
      where p.business_id = v_profile.business_id
        and p.party_type in ('customer', 'both')
        and p.is_active = true
        and regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') = regexp_replace(v_profile.phone, '\\D', '', 'g')
        and regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') <> '';

      if v_match_count = 1 then
        select p.id
        into v_party_id
        from public.parties p
        where p.business_id = v_profile.business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') = regexp_replace(v_profile.phone, '\\D', '', 'g')
          and regexp_replace(coalesce(p.phone, ''), '\\D', '', 'g') <> ''
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
        and lower(regexp_replace(trim(p.name), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(v_profile.full_name), '\\s+', ' ', 'g'));

      if v_match_count = 1 then
        select p.id
        into v_party_id
        from public.parties p
        where p.business_id = v_profile.business_id
          and p.party_type in ('customer', 'both')
          and p.is_active = true
          and lower(regexp_replace(trim(p.name), '\\s+', ' ', 'g')) = lower(regexp_replace(trim(v_profile.full_name), '\\s+', ' ', 'g'))
        limit 1;
      end if;
    end if;

    if v_party_id is not null then
      update public.profiles
      set party_id = v_party_id,
          updated_at = now()
      where id = v_profile.id
        and party_id is null;
    end if;
  end loop;
end;
$$;

-- Existing portal orders that were created before party linking should also
-- inherit the newly resolved party.
update public.sales_invoices i
set party_id = p.party_id
from public.profiles p
where i.created_by = p.id
  and i.business_id = p.business_id
  and i.order_channel = 'customer_portal'
  and i.party_id is null
  and p.role = 'user'
  and p.party_id is not null;
