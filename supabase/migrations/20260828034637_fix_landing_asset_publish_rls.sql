create or replace function public.set_landing_asset(
  p_asset_key text,
  p_mime_type text,
  p_data_base64 text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.platform_super_admins
    where user_id = auth.uid()
  ) then
    raise exception 'Super admin access required.' using errcode = '42501';
  end if;

  if p_asset_key is null or length(trim(p_asset_key)) = 0 then
    raise exception 'Asset key is required.' using errcode = '22023';
  end if;

  if p_mime_type not in ('image/png', 'image/jpeg', 'image/webp') then
    raise exception 'Unsupported image type.' using errcode = '22023';
  end if;

  if p_data_base64 is null or length(p_data_base64) = 0 then
    raise exception 'Image data is empty.' using errcode = '22023';
  end if;

  insert into public.landing_assets (asset_key, mime_type, data_base64, updated_at)
  values (trim(p_asset_key), p_mime_type, p_data_base64, now())
  on conflict (asset_key)
  do update set
    mime_type = excluded.mime_type,
    data_base64 = excluded.data_base64,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.set_landing_asset(text, text, text) from public;
grant execute on function public.set_landing_asset(text, text, text) to authenticated;
