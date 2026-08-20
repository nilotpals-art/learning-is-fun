create table if not exists public.question_paper_pdf_settings (
  institute_id uuid primary key references public.institutes(id) on delete cascade,
  header_mode text not null default 'text' check (header_mode in ('text','image','none')),
  header_title text,
  header_subtitle text,
  header_contact text,
  header_image_url text,
  watermark_mode text not null default 'text' check (watermark_mode in ('text','image','none')),
  watermark_text text not null default 'LEARNING IS FUN',
  watermark_image_url text,
  watermark_opacity numeric(4,3) not null default 0.18 check (watermark_opacity >= 0 and watermark_opacity <= 1),
  watermark_rotation numeric(6,2) not null default 35,
  watermark_size numeric(6,2) not null default 48 check (watermark_size >= 8 and watermark_size <= 180),
  footer_text text,
  show_page_numbers boolean not null default true,
  repeat_header boolean not null default true,
  page_margin numeric(6,2) not null default 48 check (page_margin >= 18 and page_margin <= 100),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.question_paper_pdf_settings enable row level security;

drop policy if exists question_paper_pdf_settings_select on public.question_paper_pdf_settings;
create policy question_paper_pdf_settings_select on public.question_paper_pdf_settings
for select to authenticated
using (exists (select 1 from public.profiles p where (p.id = auth.uid() or p.user_id = auth.uid()) and p.institute_id = question_paper_pdf_settings.institute_id and p.is_active = true));

drop policy if exists question_paper_pdf_settings_write on public.question_paper_pdf_settings;
create policy question_paper_pdf_settings_write on public.question_paper_pdf_settings
for all to authenticated
using (exists (select 1 from public.profiles p where (p.id = auth.uid() or p.user_id = auth.uid()) and p.institute_id = question_paper_pdf_settings.institute_id and p.is_active = true and lower(coalesce(p.role,'')) in ('admin','administrator','super admin','super_admin','superadmin','institute admin','institute_admin')))
with check (exists (select 1 from public.profiles p where (p.id = auth.uid() or p.user_id = auth.uid()) and p.institute_id = question_paper_pdf_settings.institute_id and p.is_active = true and lower(coalesce(p.role,'')) in ('admin','administrator','super admin','super_admin','superadmin','institute admin','institute_admin')));

grant select, insert, update, delete on public.question_paper_pdf_settings to authenticated;
