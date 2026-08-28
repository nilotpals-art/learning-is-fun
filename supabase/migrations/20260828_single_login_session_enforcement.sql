create table if not exists public.active_login_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  session_id uuid not null unique,
  claimed_at timestamptz not null default now()
);

alter table public.active_login_sessions enable row level security;
revoke all on table public.active_login_sessions from public, anon, authenticated;

create or replace function public.claim_current_login_session()
returns boolean
language plpgsql
volatile
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

  insert into public.active_login_sessions (user_id, session_id, claimed_at)
  values (v_user_id, v_session_id, now())
  on conflict (user_id) do update
    set session_id = excluded.session_id,
        claimed_at = excluded.claimed_at
    where public.active_login_sessions.session_id = excluded.session_id
       or not exists (
         select 1
         from auth.sessions s
         where s.id = public.active_login_sessions.session_id
           and s.user_id = public.active_login_sessions.user_id
       )
  returning session_id into v_claimed_session_id;

  return v_claimed_session_id = v_session_id;
end;
$$;

create or replace function public.release_current_login_session()
returns boolean
language plpgsql
volatile
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

  delete from public.active_login_sessions
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
  );
$$;

revoke all on function public.claim_current_login_session() from public, anon;
revoke all on function public.release_current_login_session() from public, anon;
revoke all on function public.is_current_auth_session_active() from public, anon;
grant execute on function public.claim_current_login_session() to authenticated;
grant execute on function public.release_current_login_session() to authenticated;
grant execute on function public.is_current_auth_session_active() to authenticated;
