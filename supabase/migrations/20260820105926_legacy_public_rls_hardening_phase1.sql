create schema if not exists private;

create or replace function private.current_profile_institute_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.institute_id from public.profiles p
  where p.is_active is true and (p.id = (select auth.uid()) or p.user_id = (select auth.uid())) limit 1
$$;
create or replace function private.current_profile_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where p.is_active is true and (p.id = (select auth.uid()) or p.user_id = (select auth.uid())) limit 1
$$;
create or replace function private.current_profile_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_profile_role() in ('admin','Super Admin','Institute Admin'), false)
$$;
create or replace function private.current_profile_has_permission(p_code text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profile_permissions pp
    join public.permissions pe on pe.id = pp.permission_id
    join public.profiles p on p.id = pp.profile_id
    where (p.id = (select auth.uid()) or p.user_id = (select auth.uid()))
      and p.is_active is true and pe.code = p_code
  )
$$;
create or replace function private.current_student_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.students s
  join public.profiles p on p.id = s.profile_id and p.institute_id = s.institute_id
  where p.is_active is true and p.role = 'Student'
    and (p.id = (select auth.uid()) or p.user_id = (select auth.uid())) limit 1
$$;
create or replace function private.can_view_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_profile_is_admin()
    or private.current_student_id() = p_student_id
    or exists (
      select 1 from public.parents pa
      join public.profiles p on p.id = pa.profile_id and p.institute_id = pa.institute_id
      join public.student_parent_links spl on spl.parent_id = pa.id and spl.institute_id = pa.institute_id
      where p.is_active is true and p.role = 'Parent'
        and (p.id = (select auth.uid()) or p.user_id = (select auth.uid()))
        and pa.is_active is true and spl.student_id = p_student_id
    )
    or private.current_profile_has_permission('module.students')
    or private.current_profile_has_permission('module.attendance')
    or private.current_profile_has_permission('module.planner')
    or private.current_profile_has_permission('module.practice')
    or private.current_profile_has_permission('module.fees')
$$;
revoke all on schema private from public, anon, authenticated;

revoke all on table public.academic_classes, public.academic_years, public.boards, public.books, public.branches,
  public.institutes, public.permissions, public.role_permissions, public.roles, public.schools,
  public.student_academics, public.student_activity_log, public.student_addresses, public.student_batches,
  public.student_documents, public.student_parents, public.subjects, public.teachers from anon;
grant select on table public.academic_classes, public.academic_years, public.boards, public.books, public.branches,
  public.institutes, public.permissions, public.role_permissions, public.roles, public.schools,
  public.student_academics, public.student_activity_log, public.student_addresses, public.student_batches,
  public.student_documents, public.student_parents, public.subjects, public.teachers to authenticated;
grant insert, update, delete on table public.academic_classes, public.academic_years, public.boards, public.books, public.branches,
  public.institutes, public.schools, public.student_academics, public.student_activity_log, public.student_addresses,
  public.student_batches, public.student_documents, public.student_parents, public.subjects, public.teachers to authenticated;

alter table public.academic_classes enable row level security;
alter table public.academic_years enable row level security;
alter table public.boards enable row level security;
alter table public.books enable row level security;
alter table public.branches enable row level security;
alter table public.institutes enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.roles enable row level security;
alter table public.schools enable row level security;
alter table public.student_academics enable row level security;
alter table public.student_activity_log enable row level security;
alter table public.student_addresses enable row level security;
alter table public.student_batches enable row level security;
alter table public.student_documents enable row level security;
alter table public.student_parents enable row level security;
alter table public.subjects enable row level security;
alter table public.teachers enable row level security;

do $$
declare t text;
begin
  foreach t in array array['academic_classes','academic_years','boards','books','branches','schools','subjects','teachers'] loop
    execute format('create policy %I_select_institute on public.%I for select to authenticated using (institute_id = (select private.current_profile_institute_id()))', t, t);
    execute format('create policy %I_insert_admin on public.%I for insert to authenticated with check ((select private.current_profile_is_admin()) and institute_id = (select private.current_profile_institute_id()))', t, t);
    execute format('create policy %I_update_admin on public.%I for update to authenticated using ((select private.current_profile_is_admin()) and institute_id = (select private.current_profile_institute_id())) with check ((select private.current_profile_is_admin()) and institute_id = (select private.current_profile_institute_id()))', t, t);
    execute format('create policy %I_delete_admin on public.%I for delete to authenticated using ((select private.current_profile_is_admin()) and institute_id = (select private.current_profile_institute_id()))', t, t);
  end loop;
end $$;
create policy institutes_select_own on public.institutes for select to authenticated using (id = (select private.current_profile_institute_id()));
create policy institutes_update_admin on public.institutes for update to authenticated using ((select private.current_profile_is_admin()) and id = (select private.current_profile_institute_id())) with check ((select private.current_profile_is_admin()) and id = (select private.current_profile_institute_id()));
create policy permissions_authenticated_read on public.permissions for select to authenticated using (true);
create policy role_permissions_authenticated_read on public.role_permissions for select to authenticated using (true);
create policy roles_authenticated_read on public.roles for select to authenticated using (institute_id is null or institute_id = (select private.current_profile_institute_id()));

do $$
declare t text;
begin
  foreach t in array array['student_academics','student_addresses','student_batches','student_documents','student_parents'] loop
    execute format('create policy %I_read on public.%I for select to authenticated using ((select private.can_view_student(student_id)))', t, t);
    execute format('create policy %I_admin_write on public.%I for all to authenticated using ((select private.current_profile_is_admin())) with check ((select private.current_profile_is_admin()))', t, t);
  end loop;
end $$;
create policy student_activity_log_read on public.student_activity_log for select to authenticated using ((select private.can_view_student(student_id)));
create policy student_activity_log_admin_insert on public.student_activity_log for insert to authenticated with check ((select private.current_profile_is_admin()));
