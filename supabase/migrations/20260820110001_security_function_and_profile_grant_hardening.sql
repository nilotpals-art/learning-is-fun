revoke insert, update, delete, truncate, references, trigger on table public.profiles from anon;

create or replace function public.current_user_permission_codes()
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(array_agg(pe.code order by pe.code), array[]::text[])
  from public.profile_permissions pp
  join public.permissions pe on pe.id = pp.permission_id
  join public.profiles p on p.id = pp.profile_id
  where p.id = auth.uid() or p.user_id = auth.uid();
$$;
revoke all on function public.current_user_permission_codes() from public, anon;
grant execute on function public.current_user_permission_codes() to authenticated, service_role;

revoke all on function public.capture_security_deposit_credit() from public, anon, authenticated;
revoke all on function public.capture_security_deposit_reversal() from public, anon, authenticated;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
