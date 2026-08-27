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
       or public.active_login_sessions.last_seen_at < now() - interval '30 minutes'
  returning user_id into claimed_user_id;

  return claimed_user_id is not null;
end;
$function$;
