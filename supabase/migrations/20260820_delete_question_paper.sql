create or replace function public.delete_question_paper(p_practice_set_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_institute_id uuid;
  v_role text;
  v_assignment_count integer := 0;
  v_attempt_count integer := 0;
  v_answer_count integer := 0;
begin
  select p.institute_id, lower(coalesce(p.role,''))
    into v_institute_id, v_role
  from public.profiles p
  where (p.id = auth.uid() or p.user_id = auth.uid())
    and p.is_active = true
  limit 1;

  if v_institute_id is null or v_role not in ('admin','administrator','super admin','super_admin','institute admin','institute_admin') then
    raise exception 'PAPER_DELETE_UNAUTHORIZED';
  end if;

  if not exists (
    select 1 from public.practice_sets s
    where s.id = p_practice_set_id and s.institute_id = v_institute_id
  ) then
    raise exception 'PAPER_NOT_FOUND';
  end if;

  select count(*) into v_assignment_count
  from public.practice_assignments a
  where a.practice_set_id = p_practice_set_id and a.institute_id = v_institute_id;

  select count(*) into v_attempt_count
  from public.practice_attempts t
  join public.practice_assignments a on a.id = t.practice_assignment_id and a.institute_id = t.institute_id
  where a.practice_set_id = p_practice_set_id and a.institute_id = v_institute_id;

  select count(*) into v_answer_count
  from public.practice_attempt_answers aa
  join public.practice_attempts t on t.id = aa.practice_attempt_id and t.institute_id = aa.institute_id
  join public.practice_assignments a on a.id = t.practice_assignment_id and a.institute_id = t.institute_id
  where a.practice_set_id = p_practice_set_id and a.institute_id = v_institute_id;

  update public.practice_attempts child
  set parent_attempt_id = null
  where child.institute_id = v_institute_id
    and child.parent_attempt_id in (
      select t.id
      from public.practice_attempts t
      join public.practice_assignments a on a.id = t.practice_assignment_id and a.institute_id = t.institute_id
      where a.practice_set_id = p_practice_set_id and a.institute_id = v_institute_id
    );

  delete from public.practice_attempt_answers aa
  using public.practice_attempts t, public.practice_assignments a
  where aa.practice_attempt_id = t.id
    and aa.institute_id = t.institute_id
    and t.practice_assignment_id = a.id
    and t.institute_id = a.institute_id
    and a.practice_set_id = p_practice_set_id
    and a.institute_id = v_institute_id;

  delete from public.practice_attempts t
  using public.practice_assignments a
  where t.practice_assignment_id = a.id
    and t.institute_id = a.institute_id
    and a.practice_set_id = p_practice_set_id
    and a.institute_id = v_institute_id;

  delete from public.practice_assignments a
  where a.practice_set_id = p_practice_set_id and a.institute_id = v_institute_id;

  delete from public.practice_sets s
  where s.id = p_practice_set_id and s.institute_id = v_institute_id;

  return jsonb_build_object(
    'deleted', true,
    'assignments', v_assignment_count,
    'attempts', v_attempt_count,
    'answers', v_answer_count
  );
end;
$$;

revoke all on function public.delete_question_paper(uuid) from public, anon;
grant execute on function public.delete_question_paper(uuid) to authenticated;
