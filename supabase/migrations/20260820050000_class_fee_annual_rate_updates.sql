create table if not exists public.class_fee_rate_changes (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete cascade,
  class_fee_structure_id uuid not null references public.class_fee_structures(id) on delete cascade,
  class_fee_structure_item_id uuid not null references public.class_fee_structure_items(id) on delete cascade,
  old_amount numeric(12,2) not null,
  new_amount numeric(12,2) not null,
  effective_from date not null,
  apply_existing boolean not null default false,
  affected_due_count integer not null default 0,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  constraint class_fee_rate_changes_amount_check check (old_amount > 0 and new_amount > 0)
);

alter table public.class_fee_rate_changes enable row level security;
grant select on public.class_fee_rate_changes to authenticated;

drop policy if exists class_fee_rate_changes_admin_select on public.class_fee_rate_changes;
create policy class_fee_rate_changes_admin_select on public.class_fee_rate_changes
for select to authenticated
using (institute_id = public.fee_admin_institute_id());

create or replace function public.update_class_fee_rates(
  p_structure_id uuid,
  p_effective_from date,
  p_apply_existing boolean,
  p_rates jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_institute uuid := public.fee_admin_institute_id();
  v_structure record;
  v_rate record;
  v_item record;
  v_affected integer := 0;
  v_total_affected integer := 0;
begin
  if v_institute is null then raise exception 'FEES_UNAUTHORIZED'; end if;
  if p_effective_from is null then raise exception 'FEES_RATE_EFFECTIVE_DATE_REQUIRED'; end if;
  if p_rates is null or jsonb_typeof(p_rates) <> 'array' or jsonb_array_length(p_rates)=0 then raise exception 'FEES_RATE_ITEMS_REQUIRED'; end if;

  select id,academic_year_id,class_id into v_structure
  from public.class_fee_structures
  where id=p_structure_id and institute_id=v_institute
  for update;
  if not found then raise exception 'FEES_STRUCTURE_NOT_FOUND'; end if;

  for v_rate in select * from jsonb_to_recordset(p_rates) as x(item_id uuid, amount numeric)
  loop
    if v_rate.amount is null or v_rate.amount <= 0 then raise exception 'FEES_STRUCTURE_ITEM_INVALID'; end if;
    select i.* into v_item
    from public.class_fee_structure_items i
    where i.id=v_rate.item_id and i.class_fee_structure_id=p_structure_id and i.institute_id=v_institute
    for update;
    if not found then raise exception 'FEES_STRUCTURE_OVERRIDE_INVALID'; end if;

    v_affected := 0;
    if p_apply_existing and v_item.schedule_type='monthly' then
      with eligible as (
        select d.id,d.net_amount,public.fee_due_outstanding(d.id) as outstanding
        from public.student_fee_dues d
        join public.student_academics sa on sa.student_id=d.student_id
          and sa.academic_year_id=d.academic_year_id
          and sa.class_id=v_structure.class_id
        where d.institute_id=v_institute
          and d.academic_year_id=v_structure.academic_year_id
          and d.fee_head_id=v_item.fee_head_id
          and d.due_date >= p_effective_from
          and d.status in ('due','partially_paid')
      ), updated as (
        update public.student_fee_dues d
        set gross_amount = greatest(v_rate.amount, e.net_amount-e.outstanding),
            discount_amount = 0,
            net_amount = greatest(v_rate.amount, e.net_amount-e.outstanding),
            updated_at = now()
        from eligible e
        where d.id=e.id
        returning d.id
      ) select count(*) into v_affected from updated;

      perform public.fee_recalculate_due_status(d.id)
      from public.student_fee_dues d
      join public.student_academics sa on sa.student_id=d.student_id and sa.academic_year_id=d.academic_year_id and sa.class_id=v_structure.class_id
      where d.institute_id=v_institute and d.academic_year_id=v_structure.academic_year_id and d.fee_head_id=v_item.fee_head_id and d.due_date>=p_effective_from;
    end if;

    update public.class_fee_structure_items
      set amount=v_rate.amount,updated_at=now()
      where id=v_item.id;

    insert into public.class_fee_rate_changes(institute_id,class_fee_structure_id,class_fee_structure_item_id,old_amount,new_amount,effective_from,apply_existing,affected_due_count,changed_by)
    values(v_institute,p_structure_id,v_item.id,v_item.amount,v_rate.amount,p_effective_from,p_apply_existing,v_affected,(select auth.uid()));

    v_total_affected := v_total_affected + v_affected;
  end loop;

  update public.class_fee_structures set updated_at=now(),updated_by=(select auth.uid()) where id=p_structure_id;
  return jsonb_build_object('structureId',p_structure_id,'affectedDueCount',v_total_affected,'applyExisting',p_apply_existing,'effectiveFrom',p_effective_from);
end $$;

revoke all on function public.update_class_fee_rates(uuid,date,boolean,jsonb) from public;
grant execute on function public.update_class_fee_rates(uuid,date,boolean,jsonb) to authenticated;
