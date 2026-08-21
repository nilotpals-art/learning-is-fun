create or replace function public.pre_otp_profile_status(p_email text)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  with matched as (
    select
      p.id,
      p.institute_id,
      p.is_active,
      coalesce(nullif(btrim(p.role),''), r.name) as resolved_role
    from public.profiles p
    left join public.roles r on r.id = p.role_id
    where lower(p.email) = lower(trim(p_email))
  )
  select case
    when not exists (select 1 from matched) then 'not_found'
    when exists (
      select 1
      from matched m
      where m.is_active is true
        and (
          m.resolved_role not in ('Student','Parent')
          or (
            m.resolved_role = 'Student'
            and exists (
              select 1
              from public.students s
              where s.profile_id = m.id
                and s.institute_id = m.institute_id
                and s.status = 'Active'
            )
          )
          or (
            m.resolved_role = 'Parent'
            and exists (
              select 1
              from public.parents pa
              where pa.profile_id = m.id
                and pa.institute_id = m.institute_id
                and pa.is_active is true
                and exists (
                  select 1
                  from public.student_parent_links spl
                  join public.students s
                    on s.id = spl.student_id
                   and s.institute_id = spl.institute_id
                  where spl.parent_id = pa.id
                    and spl.institute_id = pa.institute_id
                    and s.status = 'Active'
                )
            )
          )
        )
    ) then 'active'
    else 'inactive'
  end;
$function$;
