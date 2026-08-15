begin;

alter table public.batch_schedule_overlap_approvals
  drop constraint if exists batch_overlap_reason_required;

commit;
