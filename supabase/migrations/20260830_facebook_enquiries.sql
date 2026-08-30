create table if not exists public.facebook_enquiries (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  student_name text not null,
  class_name text not null,
  board text not null check (board in ('ICSE','ISC','CBSE')),
  contact_no text not null check (contact_no ~ '^[6-9][0-9]{9}$'),
  callback_time text not null check (callback_time in ('Morning','Afternoon','Evening','Anytime')),
  source text not null default 'Facebook',
  status text not null default 'New' check (status in ('New','Contacted','Enrolled','Closed')),
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facebook_enquiries_institute_created_idx
  on public.facebook_enquiries(institute_id, created_at desc);
create index if not exists facebook_enquiries_institute_status_idx
  on public.facebook_enquiries(institute_id, status);

alter table public.facebook_enquiries enable row level security;

revoke all on table public.facebook_enquiries from anon, authenticated;
