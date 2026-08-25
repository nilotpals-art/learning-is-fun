create table if not exists public.student_syllabus_submissions (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  book_name text,
  chapter text,
  exam_name text,
  student_note text,
  recipient_email text not null,
  file_names jsonb not null default '[]'::jsonb,
  file_count integer not null check (file_count > 0),
  total_bytes bigint not null check (total_bytes > 0),
  provider text not null default 'brevo',
  provider_message_id text,
  delivery_status text not null check (delivery_status in ('pending','sent','failed')),
  safe_error_code text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists student_syllabus_submissions_student_idx on public.student_syllabus_submissions(student_id, submitted_at desc);
create index if not exists student_syllabus_submissions_institute_idx on public.student_syllabus_submissions(institute_id, submitted_at desc);

alter table public.student_syllabus_submissions enable row level security;

drop policy if exists syllabus_submission_student_select on public.student_syllabus_submissions;
create policy syllabus_submission_student_select on public.student_syllabus_submissions
for select using (
  student_id in (select s.id from public.students s where s.profile_id = auth.uid())
);

drop policy if exists syllabus_submission_student_insert on public.student_syllabus_submissions;
create policy syllabus_submission_student_insert on public.student_syllabus_submissions
for insert with check (
  student_id in (select s.id from public.students s where s.profile_id = auth.uid())
  and institute_id = (select p.institute_id from public.profiles p where p.id = auth.uid())
);

drop policy if exists syllabus_submission_student_update on public.student_syllabus_submissions;
create policy syllabus_submission_student_update on public.student_syllabus_submissions
for update using (
  student_id in (select s.id from public.students s where s.profile_id = auth.uid())
) with check (
  student_id in (select s.id from public.students s where s.profile_id = auth.uid())
);

drop policy if exists syllabus_submission_admin_select on public.student_syllabus_submissions;
create policy syllabus_submission_admin_select on public.student_syllabus_submissions
for select using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.institute_id = student_syllabus_submissions.institute_id
      and p.is_active = true
      and lower(coalesce(p.role,'')) in ('admin','administrator','super admin','superadmin','owner')
  )
);
