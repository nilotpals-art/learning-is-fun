insert into public.roles (name, description)
select 'Accountant', 'Finance staff with administrator-assigned module access'
where not exists (select 1 from public.roles where lower(name) = 'accountant');

insert into public.permissions (code, name, description)
values
  ('module.academic', 'Academic Setup', 'Access academic setup modules'),
  ('module.students', 'Student Management', 'Access student management modules'),
  ('module.attendance', 'Attendance', 'Access attendance modules'),
  ('module.planner', 'Learning Planner', 'Access learning planner modules'),
  ('module.practice', 'Practice Work', 'Access practice work modules'),
  ('module.fees', 'Fees', 'Access fees and fee reports')
on conflict (code) do update set name = excluded.name, description = excluded.description;

create table if not exists public.profile_permissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  granted_by uuid null references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (profile_id, permission_id)
);
create index if not exists profile_permissions_profile_idx on public.profile_permissions(profile_id);
alter table public.profile_permissions enable row level security;
revoke all on public.profile_permissions from anon;
grant select on public.profile_permissions to authenticated;

drop policy if exists "Users read own staff permissions" on public.profile_permissions;
create policy "Users read own staff permissions" on public.profile_permissions for select to authenticated
using (exists (select 1 from public.profiles p where p.id = profile_permissions.profile_id and (p.id = (select auth.uid()) or p.user_id = (select auth.uid()))));

create or replace function public.current_user_permission_codes()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(pe.code order by pe.code), array[]::text[])
  from public.profile_permissions pp
  join public.permissions pe on pe.id = pp.permission_id
  join public.profiles p on p.id = pp.profile_id
  where p.id = auth.uid() or p.user_id = auth.uid();
$$;
revoke execute on function public.current_user_permission_codes() from public, anon;
grant execute on function public.current_user_permission_codes() to authenticated;

create or replace function public.list_managed_staff()
returns table (id uuid,name text,email text,mobile text,branch_id uuid,branch_name text,role text,is_active boolean,user_id uuid,created_at timestamptz,permission_codes text[])
language plpgsql security definer set search_path = '' as $$
declare manager public.profiles%rowtype;
begin
  select * into manager from public.profiles p where p.id = auth.uid() or p.user_id = auth.uid() limit 1;
  if manager.id is null or lower(coalesce(manager.role,'')) not in ('admin','administrator','super admin','super_admin','institute admin','institute_admin') then raise exception 'STAFF_MANAGEMENT_UNAUTHORIZED'; end if;
  return query
  select p.id,p.name,p.email,p.mobile,p.branch_id,b.name,p.role,coalesce(p.is_active,false),p.user_id,p.created_at,
    coalesce(array_agg(pe.code order by pe.code) filter (where pe.code is not null),array[]::text[])
  from public.profiles p
  left join public.branches b on b.id=p.branch_id
  left join public.profile_permissions pp on pp.profile_id=p.id
  left join public.permissions pe on pe.id=pp.permission_id
  where p.institute_id=manager.institute_id and lower(coalesce(p.role,'')) in ('teacher','accountant')
  group by p.id,b.name order by p.name;
end;
$$;
revoke execute on function public.list_managed_staff() from public, anon;
grant execute on function public.list_managed_staff() to authenticated;

create or replace function public.finalize_staff_identity(p_auth_user_id uuid,p_email text,p_name text,p_mobile text,p_branch_id uuid,p_role text,p_is_active boolean,p_permission_codes text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare manager public.profiles%rowtype; staff_role_id uuid; new_profile_id uuid := p_auth_user_id;
begin
  select * into manager from public.profiles p where p.id=auth.uid() or p.user_id=auth.uid() limit 1;
  if manager.id is null or lower(coalesce(manager.role,'')) not in ('admin','administrator','super admin','super_admin','institute admin','institute_admin') then raise exception 'STAFF_MANAGEMENT_UNAUTHORIZED'; end if;
  if lower(trim(p_role)) not in ('teacher','accountant') then raise exception 'STAFF_ROLE_INVALID'; end if;
  if p_branch_id is not null and not exists(select 1 from public.branches b where b.id=p_branch_id and b.institute_id=manager.institute_id) then raise exception 'STAFF_BRANCH_INVALID'; end if;
  select r.id into staff_role_id from public.roles r where lower(r.name)=lower(trim(p_role)) order by r.institute_id nulls first limit 1;
  insert into public.profiles(id,user_id,institute_id,branch_id,name,email,mobile,role,role_id,is_active)
  values(new_profile_id,p_auth_user_id,manager.institute_id,p_branch_id,p_name,lower(p_email),p_mobile,initcap(lower(p_role)),staff_role_id,p_is_active);
  insert into public.profile_permissions(profile_id,permission_id,granted_by)
  select new_profile_id,pe.id,manager.id from public.permissions pe where pe.code=any(coalesce(p_permission_codes,array[]::text[]));
  return new_profile_id;
end;
$$;
revoke execute on function public.finalize_staff_identity(uuid,text,text,text,uuid,text,boolean,text[]) from public, anon;
grant execute on function public.finalize_staff_identity(uuid,text,text,text,uuid,text,boolean,text[]) to authenticated;

create or replace function public.update_managed_staff(p_profile_id uuid,p_name text,p_mobile text,p_branch_id uuid,p_role text,p_is_active boolean,p_permission_codes text[])
returns void language plpgsql security definer set search_path = '' as $$
declare manager public.profiles%rowtype; target public.profiles%rowtype; staff_role_id uuid;
begin
  select * into manager from public.profiles p where p.id=auth.uid() or p.user_id=auth.uid() limit 1;
  if manager.id is null or lower(coalesce(manager.role,'')) not in ('admin','administrator','super admin','super_admin','institute admin','institute_admin') then raise exception 'STAFF_MANAGEMENT_UNAUTHORIZED'; end if;
  select * into target from public.profiles p where p.id=p_profile_id and p.institute_id=manager.institute_id limit 1;
  if target.id is null or lower(coalesce(target.role,'')) not in ('teacher','accountant') then raise exception 'STAFF_NOT_FOUND'; end if;
  if lower(trim(p_role)) not in ('teacher','accountant') then raise exception 'STAFF_ROLE_INVALID'; end if;
  if p_branch_id is not null and not exists(select 1 from public.branches b where b.id=p_branch_id and b.institute_id=manager.institute_id) then raise exception 'STAFF_BRANCH_INVALID'; end if;
  select r.id into staff_role_id from public.roles r where lower(r.name)=lower(trim(p_role)) order by r.institute_id nulls first limit 1;
  update public.profiles set name=p_name,mobile=p_mobile,branch_id=p_branch_id,role=initcap(lower(p_role)),role_id=staff_role_id,is_active=p_is_active,updated_at=now() where id=p_profile_id;
  delete from public.profile_permissions where profile_id=p_profile_id;
  insert into public.profile_permissions(profile_id,permission_id,granted_by)
  select p_profile_id,pe.id,manager.id from public.permissions pe where pe.code=any(coalesce(p_permission_codes,array[]::text[]));
end;
$$;
revoke execute on function public.update_managed_staff(uuid,text,text,uuid,text,boolean,text[]) from public, anon;
grant execute on function public.update_managed_staff(uuid,text,text,uuid,text,boolean,text[]) to authenticated;
