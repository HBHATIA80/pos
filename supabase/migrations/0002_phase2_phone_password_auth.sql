-- Phase 2: phone-number + password authentication foundation.
-- A public signup creates the first business and its admin profile.
-- Staff and user accounts will be created by an admin in a later phase.
-- No GST/tax logic is introduced.

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
begin
  v_full_name := trim(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    'New User'
  ));

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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Creates a business and admin profile for a newly registered phone/password user.';
