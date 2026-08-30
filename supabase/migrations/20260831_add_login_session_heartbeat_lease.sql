alter table public.active_login_sessions add column if not exists last_seen_at timestamptz;
update public.active_login_sessions set last_seen_at = now() where last_seen_at is null;
alter table public.active_login_sessions alter column last_seen_at set default now();
alter table public.active_login_sessions alter column last_seen_at set not null;

create or replace function public.claim_current_login_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_claimed_session_id uuid;
begin
  if v_user_id is null or v_session_id is null then
    return false;
  end if;

  insert into public.active_login_sessions (user_id, session_id, claimed_at, last_seen_at)
  values (v_user_id, v_session_id, now(), now())
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        claimed_at = excluded.claimed_at,
        last_seen_at = excluded.last_seen_at
    where public.active_login_sessions.session_id = excluded.session_id
       or public.active_login_sessions.last_seen_at < now() - interval '2 minutes'
       or not exists (
         select 1
         from auth.sessions s
         where s.id = public.active_login_sessions.session_id
           and s.user_id = public.active_login_sessions.user_id
       )
  returning session_id into v_claimed_session_id;

  return coalesce(v_claimed_session_id = v_session_id, false);
end;
$$;

create or replace function public.touch_current_login_session()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if v_user_id is null or v_session_id is null then
    return false;
  end if;

  update public.active_login_sessions
  set last_seen_at = now()
  where user_id = v_user_id
    and session_id = v_session_id;

  return found;
end;
$$;

create or replace function public.is_current_auth_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.sessions as s
    join public.active_login_sessions as a
      on a.user_id = s.user_id
     and a.session_id = s.id
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
      and a.last_seen_at >= now() - interval '2 minutes'
  );
$$;

revoke all on function public.claim_current_login_session() from public, anon;
revoke all on function public.touch_current_login_session() from public, anon;
revoke all on function public.is_current_auth_session_active() from public, anon;
grant execute on function public.claim_current_login_session() to authenticated, service_role;
grant execute on function public.touch_current_login_session() to authenticated, service_role;
grant execute on function public.is_current_auth_session_active() to authenticated, service_role;
