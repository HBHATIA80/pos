-- Distinguish an active-session heartbeat from a fresh login claim.
-- A stale session must not revive itself merely because a request arrives after 10 minutes.

create or replace function public.touch_active_login(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_user_id uuid;
  touched_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null or p_session_id is null then
    return false;
  end if;

  update public.active_login_sessions
  set last_seen_at = now()
  where user_id = current_user_id
    and session_id = p_session_id
    and last_seen_at >= now() - interval '10 minutes'
  returning user_id into touched_user_id;

  return touched_user_id is not null;
end;
$function$;

revoke all on function public.touch_active_login(uuid) from public, anon;
grant execute on function public.touch_active_login(uuid) to authenticated;
