-- BIZYBUK.IN application session lock timeout.
-- Applies uniformly to admin, staff, customer and other authenticated roles.
-- The browser session guard signs the user out after 10 minutes without activity;
-- this database lock also allows a new device to claim the account after 10 minutes.

create or replace function public.claim_active_login(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid;
  claimed_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null or p_session_id is null then
    return false;
  end if;

  insert into public.active_login_sessions (user_id, session_id, created_at, last_seen_at)
  values (current_user_id, p_session_id, now(), now())
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        last_seen_at = now()
    where public.active_login_sessions.session_id = excluded.session_id
       or public.active_login_sessions.last_seen_at < now() - interval '10 minutes'
  returning user_id into claimed_user_id;

  return claimed_user_id is not null;
end;
$function$;

revoke all on function public.claim_active_login(uuid) from public, anon;
grant execute on function public.claim_active_login(uuid) to authenticated;
