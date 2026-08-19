create table if not exists public.student_fee_assignments (
  id uuid primary key default gen_random_uuid(),
  institute_id uuid not null references public.institutes(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  fee_head_id uuid not null references public.fee_heads(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  discount_type text null check (discount_type is null or discount_type in ('fixed','percentage')),
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  effective_from date null,
  effective_to date null,
  is_active boolean not null default true,
  class_fee_structure_item_id uuid null references public.class_fee_structure_items(id) on delete set null,
  fee_nature_snapshot text not null default 'regular' check (fee_nature_snapshot in ('regular','one_time','refundable_deposit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_fee_assignments_dates_check check (effective_to is null or effective_from is null or effective_to >= effective_from)
);
create index if not exists student_fee_assignments_scope_idx on public.student_fee_assignments(institute_id,student_id,academic_year_id);
create index if not exists student_fee_assignments_structure_item_idx on public.student_fee_assignments(class_fee_structure_item_id) where class_fee_structure_item_id is not null;
alter table public.student_fee_assignments enable row level security;
grant select on public.student_fee_assignments to authenticated;
drop policy if exists student_fee_assignments_admin_select on public.student_fee_assignments;
create policy student_fee_assignments_admin_select on public.student_fee_assignments for select to authenticated using (institute_id=public.fee_admin_institute_id());
drop policy if exists student_fee_assignments_student_select on public.student_fee_assignments;
create policy student_fee_assignments_student_select on public.student_fee_assignments for select to authenticated using (student_id=public.fee_student_id(institute_id));
drop policy if exists student_fee_assignments_parent_select on public.student_fee_assignments;
create policy student_fee_assignments_parent_select on public.student_fee_assignments for select to authenticated using (public.fee_parent_can_view_student(institute_id,student_id));
do $$ begin
  if not exists (select 1 from pg_constraint where conname='student_fee_dues_assignment_fkey') then
    alter table public.student_fee_dues add constraint student_fee_dues_assignment_fkey foreign key (student_fee_assignment_id) references public.student_fee_assignments(id) on delete restrict;
  end if;
end $$;

create or replace function public.update_class_fee_rates(p_structure_id uuid,p_effective_from date,p_apply_existing boolean,p_rates jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_institute uuid:=public.fee_admin_institute_id();v_structure record;v_rate record;v_item record;v_affected integer:=0;v_total_affected integer:=0;
begin
  if v_institute is null then raise exception 'FEES_UNAUTHORIZED'; end if;
  if p_effective_from is null then raise exception 'FEES_RATE_EFFECTIVE_DATE_REQUIRED'; end if;
  if p_rates is null or jsonb_typeof(p_rates)<>'array' or jsonb_array_length(p_rates)=0 then raise exception 'FEES_RATE_ITEMS_REQUIRED'; end if;
  select id,academic_year_id,class_id into v_structure from public.class_fee_structures where id=p_structure_id and institute_id=v_institute for update;
  if not found then raise exception 'FEES_STRUCTURE_NOT_FOUND'; end if;
  for v_rate in select * from jsonb_to_recordset(p_rates) as x(item_id uuid,amount numeric) loop
    if v_rate.amount is null or v_rate.amount<=0 then raise exception 'FEES_STRUCTURE_ITEM_INVALID'; end if;
    select i.* into v_item from public.class_fee_structure_items i where i.id=v_rate.item_id and i.class_fee_structure_id=p_structure_id and i.institute_id=v_institute for update;
    if not found then raise exception 'FEES_STRUCTURE_OVERRIDE_INVALID'; end if;
    v_affected:=0;
    if p_apply_existing and v_item.schedule_type='monthly' then
      with eligible as (
        select d.id,d.net_amount,public.fee_due_outstanding(d.id) as outstanding from public.student_fee_dues d
        where d.institute_id=v_institute and d.academic_year_id=v_structure.academic_year_id and d.fee_head_id=v_item.fee_head_id and d.due_date>=p_effective_from and d.status in('due','partially_paid')
        and (exists(select 1 from public.student_academics sa where sa.student_id=d.student_id and sa.academic_year_id=d.academic_year_id and sa.class_id=v_structure.class_id)
          or exists(select 1 from public.student_assignments sa where sa.student_id=d.student_id and sa.academic_year_id=d.academic_year_id and sa.class_id=v_structure.class_id and sa.status='Current'))
      ), updated as (
        update public.student_fee_dues d set gross_amount=greatest(v_rate.amount,e.net_amount-e.outstanding),discount_amount=0,net_amount=greatest(v_rate.amount,e.net_amount-e.outstanding),updated_at=now()
        from eligible e where d.id=e.id returning d.id
      ) select count(*) into v_affected from updated;
      perform public.fee_recalculate_due_status(d.id) from public.student_fee_dues d where d.institute_id=v_institute and d.academic_year_id=v_structure.academic_year_id and d.fee_head_id=v_item.fee_head_id and d.due_date>=p_effective_from;
    end if;
    update public.class_fee_structure_items set amount=v_rate.amount,updated_at=now() where id=v_item.id;
    insert into public.class_fee_rate_changes(institute_id,class_fee_structure_id,class_fee_structure_item_id,old_amount,new_amount,effective_from,apply_existing,affected_due_count,changed_by)
    values(v_institute,p_structure_id,v_item.id,v_item.amount,v_rate.amount,p_effective_from,p_apply_existing,v_affected,(select auth.uid()));
    v_total_affected:=v_total_affected+v_affected;
  end loop;
  update public.class_fee_structures set updated_at=now(),updated_by=(select auth.uid()) where id=p_structure_id;
  return jsonb_build_object('structureId',p_structure_id,'affectedDueCount',v_total_affected,'applyExisting',p_apply_existing,'effectiveFrom',p_effective_from);
end $$;
revoke all on function public.update_class_fee_rates(uuid,date,boolean,jsonb) from public;
grant execute on function public.update_class_fee_rates(uuid,date,boolean,jsonb) to authenticated;
