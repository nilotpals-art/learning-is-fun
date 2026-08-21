drop policy if exists class_schedules_student_select on public.class_schedules;
create policy class_schedules_student_select
on public.class_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    join public.student_assignments sa
      on sa.student_id = s.id
     and sa.institute_id = s.institute_id
    where s.profile_id = auth.uid()
      and s.status = 'Active'
      and s.institute_id = class_schedules.institute_id
      and sa.batch_id = class_schedules.batch_id
      and sa.status = 'Current'
      and sa.effective_from <= coalesce(class_schedules.effective_to, '9999-12-31'::date)
      and (sa.effective_to is null or sa.effective_to >= class_schedules.effective_from)
  )
);

drop policy if exists class_schedules_parent_select on public.class_schedules;
create policy class_schedules_parent_select
on public.class_schedules
for select
to authenticated
using (
  exists (
    select 1
    from public.parents pa
    join public.student_parent_links spl
      on spl.parent_id = pa.id
     and spl.institute_id = pa.institute_id
    join public.students s
      on s.id = spl.student_id
     and s.institute_id = spl.institute_id
    join public.student_assignments sa
      on sa.student_id = s.id
     and sa.institute_id = s.institute_id
    where pa.profile_id = auth.uid()
      and pa.is_active is true
      and s.status = 'Active'
      and pa.institute_id = class_schedules.institute_id
      and sa.batch_id = class_schedules.batch_id
      and sa.status = 'Current'
      and sa.effective_from <= coalesce(class_schedules.effective_to, '9999-12-31'::date)
      and (sa.effective_to is null or sa.effective_to >= class_schedules.effective_from)
  )
);

drop policy if exists class_fee_structure_items_student_select on public.class_fee_structure_items;
create policy class_fee_structure_items_student_select
on public.class_fee_structure_items
for select
to authenticated
using (
  exists (
    select 1
    from public.student_fee_assignments sfa
    join public.students s on s.id = sfa.student_id
    where sfa.institute_id = class_fee_structure_items.institute_id
      and sfa.class_fee_structure_item_id = class_fee_structure_items.id
      and sfa.is_active is true
      and s.profile_id = auth.uid()
      and s.status = 'Active'
  )
);

drop policy if exists class_fee_structure_items_parent_select on public.class_fee_structure_items;
create policy class_fee_structure_items_parent_select
on public.class_fee_structure_items
for select
to authenticated
using (
  exists (
    select 1
    from public.student_fee_assignments sfa
    join public.student_parent_links spl
      on spl.student_id = sfa.student_id
     and spl.institute_id = sfa.institute_id
    join public.parents pa
      on pa.id = spl.parent_id
     and pa.institute_id = spl.institute_id
    join public.students s
      on s.id = sfa.student_id
     and s.institute_id = sfa.institute_id
    where sfa.institute_id = class_fee_structure_items.institute_id
      and sfa.class_fee_structure_item_id = class_fee_structure_items.id
      and sfa.is_active is true
      and pa.profile_id = auth.uid()
      and pa.is_active is true
      and s.status = 'Active'
  )
);

drop policy if exists security_deposit_student_select on public.student_security_deposit_entries;
create policy security_deposit_student_select
on public.student_security_deposit_entries
for select
to authenticated
using (student_id = public.fee_student_id(institute_id));

drop policy if exists security_deposit_parent_select on public.student_security_deposit_entries;
create policy security_deposit_parent_select
on public.student_security_deposit_entries
for select
to authenticated
using (public.fee_parent_can_view_student(institute_id, student_id));
