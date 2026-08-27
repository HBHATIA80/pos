-- BIZYBUK.IN single-login enforcement.
-- One authenticated user may hold exactly one application session at a time.

create table if not exists public.active_login_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.active_login_sessions enable row level security;

revoke all on table public.active_login_sessions from anon, authenticated;
grant select on table public.active_login_sessions to authenticated;

drop policy if exists "Users can view their own active login" on public.active_login_sessions;
create policy "Users can view their own active login"
on public.active_login_sessions
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.claim_active_login(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
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
    set last_seen_at = now()
    where public.active_login_sessions.session_id = excluded.session_id
  returning user_id into claimed_user_id;

  return claimed_user_id is not null;
end;
$$;

create or replace function public.release_active_login(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  removed_count integer;
begin
  current_user_id := auth.uid();
  if current_user_id is null or p_session_id is null then
    return false;
  end if;

  delete from public.active_login_sessions
  where user_id = current_user_id
    and session_id = p_session_id;

  get diagnostics removed_count = row_count;
  return removed_count > 0;
end;
$$;

revoke all on function public.claim_active_login(uuid) from public, anon;
grant execute on function public.claim_active_login(uuid) to authenticated;
revoke all on function public.release_active_login(uuid) from public, anon;
grant execute on function public.release_active_login(uuid) to authenticated;
