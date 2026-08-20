create or replace function public.pre_otp_profile_status(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not exists (
      select 1 from public.profiles p where lower(p.email) = lower(trim(p_email))
    ) then 'not_found'
    when exists (
      select 1 from public.profiles p where lower(p.email) = lower(trim(p_email)) and p.is_active is true
    ) then 'active'
    else 'inactive'
  end;
$$;
revoke all on function public.pre_otp_profile_status(text) from public;
grant execute on function public.pre_otp_profile_status(text) to anon, authenticated, service_role;

revoke all on table public.profiles from anon;
grant select on table public.profiles to authenticated, service_role;
grant insert, update, delete on table public.profiles to service_role;

alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles
for select to authenticated
using (id = (select auth.uid()) or user_id = (select auth.uid()));

create policy profiles_select_admin_institute on public.profiles
for select to authenticated
using (
  (select private.current_profile_is_admin())
  and institute_id = (select private.current_profile_institute_id())
);
