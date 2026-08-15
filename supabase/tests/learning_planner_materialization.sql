-- Compatibility assertions after routine event materialization was retired.
begin;

do $$
begin
  if has_function_privilege('authenticated', 'public.generate_schedule_events(date,date,uuid,uuid)', 'EXECUTE') then
    raise exception 'Authenticated users can still materialize routine events';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.schedule_events'::regclass
      and tgname='schedule_events_prevent_routine_materialization'
  ) then raise exception 'Routine materialization trigger missing'; end if;
  if exists (
    select 1 from public.schedule_events
    where title like 'CODEX BROWSER SMOKE 20260815%'
      and created_at > now()
  ) then raise exception 'Invalid controlled history timestamp'; end if;
end $$;

-- Historical materialized rows are compatibility records: this suite deliberately
-- performs no update, relink, migration, or deletion against them.
rollback;
