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
    where s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and s.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_current_auth_session_active() from public;
revoke execute on function public.is_current_auth_session_active() from anon;
grant execute on function public.is_current_auth_session_active() to authenticated;
