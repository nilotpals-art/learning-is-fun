create or replace function public.fee_parent_can_view_student(p_institute_id uuid, p_student_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.parents pa
    join public.profiles p on p.id=pa.profile_id and p.institute_id=pa.institute_id
    left join public.roles r on r.id=p.role_id
    join public.student_parent_links spl on spl.parent_id=pa.id and spl.institute_id=pa.institute_id
    where p.id=(select auth.uid())
      and p.is_active is true
      and coalesce(nullif(btrim(p.role),''),r.name)='Parent'
      and pa.is_active is true
      and pa.institute_id=p_institute_id
      and spl.student_id=p_student_id
  )
$function$;
