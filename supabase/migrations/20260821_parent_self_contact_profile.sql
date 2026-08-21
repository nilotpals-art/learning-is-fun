create policy parents_self_select on public.parents
for select to authenticated
using (profile_id = (select auth.uid()) and is_active is true);

create or replace function public.update_own_parent_contact(p_mobile text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_parent public.parents%rowtype;
  v_mobile text := btrim(coalesce(p_mobile, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if auth.uid() is null then raise exception 'PARENT_PROFILE_UNAUTHENTICATED'; end if;
  if v_mobile = '' then raise exception 'PARENT_PROFILE_MOBILE_REQUIRED'; end if;
  if v_email = '' then raise exception 'PARENT_PROFILE_EMAIL_REQUIRED'; end if;

  select * into v_parent
  from public.parents
  where profile_id = auth.uid() and is_active is true
  for update;

  if v_parent.id is null then raise exception 'PARENT_PROFILE_NOT_FOUND'; end if;

  if exists (
    select 1 from public.parents p
    where p.institute_id = v_parent.institute_id
      and p.id <> v_parent.id
      and lower(btrim(p.email)) = v_email
  ) then raise exception 'PARENT_PROFILE_EMAIL_IN_USE'; end if;

  update public.parents
  set mobile = v_mobile,
      email = v_email,
      updated_at = now()
  where id = v_parent.id;

  return jsonb_build_object('id', v_parent.id, 'name', v_parent.name, 'mobile', v_mobile, 'email', v_email);
end;
$function$;

revoke all on function public.update_own_parent_contact(text, text) from public, anon;
grant execute on function public.update_own_parent_contact(text, text) to authenticated;
