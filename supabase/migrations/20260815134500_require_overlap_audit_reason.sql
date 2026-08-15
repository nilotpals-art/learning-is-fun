begin;

alter table public.batch_schedule_overlap_approvals
  add constraint batch_overlap_reason_required
  check (reason is not null and btrim(reason) <> '') not valid;

commit;
