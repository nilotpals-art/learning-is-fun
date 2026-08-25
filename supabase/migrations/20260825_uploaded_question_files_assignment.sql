alter table public.practice_question_source_files
  add column if not exists board_id uuid references public.boards(id),
  add column if not exists class_id uuid references public.academic_classes(id),
  add column if not exists subject_id uuid references public.subjects(id),
  add column if not exists book_name text,
  add column if not exists chapter text,
  add column if not exists question_exam_date date,
  add column if not exists source_full_marks numeric,
  add column if not exists display_title text;

create table if not exists public.practice_file_assignments (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  source_file_id uuid not null references public.practice_question_source_files(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  student_id uuid not null references public.students(id) on delete cascade,
  available_from timestamptz,
  due_at timestamptz,
  status text not null default 'assigned' check (status in ('assigned','closed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (source_file_id, student_id)
);

create index if not exists practice_file_assignments_institute_student_idx on public.practice_file_assignments(institute_id, student_id, created_at desc);
create index if not exists practice_file_assignments_source_idx on public.practice_file_assignments(source_file_id);

alter table public.practice_file_assignments enable row level security;

drop policy if exists practice_file_assignments_admin_all on public.practice_file_assignments;
create policy practice_file_assignments_admin_all on public.practice_file_assignments for all using (practice_work_admin_scope(institute_id)) with check (practice_work_admin_scope(institute_id));

drop policy if exists practice_file_assignments_student_select on public.practice_file_assignments;
create policy practice_file_assignments_student_select on public.practice_file_assignments for select using (student_id = practice_work_student_id(institute_id));

drop policy if exists practice_file_assignments_parent_select on public.practice_file_assignments;
create policy practice_file_assignments_parent_select on public.practice_file_assignments for select using (practice_work_parent_can_view_student(institute_id, student_id));

drop policy if exists practice_source_student_assigned_select on public.practice_question_source_files;
create policy practice_source_student_assigned_select on public.practice_question_source_files for select using (
  exists (
    select 1 from public.practice_file_assignments a
    where a.source_file_id = practice_question_source_files.id
      and a.institute_id = practice_question_source_files.institute_id
      and a.student_id = practice_work_student_id(a.institute_id)
  )
);

drop policy if exists practice_source_parent_assigned_select on public.practice_question_source_files;
create policy practice_source_parent_assigned_select on public.practice_question_source_files for select using (
  exists (
    select 1 from public.practice_file_assignments a
    where a.source_file_id = practice_question_source_files.id
      and a.institute_id = practice_question_source_files.institute_id
      and practice_work_parent_can_view_student(a.institute_id, a.student_id)
  )
);
