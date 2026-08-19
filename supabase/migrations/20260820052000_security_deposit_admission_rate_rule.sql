create or replace function public.class_fee_item_amount_on_date(p_item_id uuid,p_on_date date)
returns numeric
language sql
stable
set search_path=''
as $$
  select coalesce(
    (select c.new_amount from public.class_fee_rate_changes c where c.class_fee_structure_item_id=p_item_id and c.effective_from<=p_on_date order by c.effective_from desc,c.changed_at desc limit 1),
    (select c.old_amount from public.class_fee_rate_changes c where c.class_fee_structure_item_id=p_item_id order by c.effective_from asc,c.changed_at asc limit 1),
    (select i.amount from public.class_fee_structure_items i where i.id=p_item_id)
  );
$$;

create or replace function public.class_monthly_fee_on_date(p_structure_id uuid,p_on_date date)
returns numeric
language sql
stable
set search_path=''
as $$
  select coalesce(sum(public.class_fee_item_amount_on_date(i.id,p_on_date)),0)
  from public.class_fee_structure_items i
  join public.fee_heads fh on fh.id=i.fee_head_id and fh.institute_id=i.institute_id
  where i.class_fee_structure_id=p_structure_id
    and i.schedule_type='monthly'
    and fh.fee_nature<>'refundable_deposit';
$$;

create or replace function public.apply_class_fee_structure(p_student_id uuid,p_structure_id uuid,p_overrides jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_institute uuid:=public.fee_admin_institute_id();
  v_structure record;
  v_student record;
  v_item record;
  v_override jsonb;
  v_include boolean;
  v_amount numeric(12,2);
  v_discount_type text;
  v_discount_value numeric;
  v_unit_discount numeric(12,2);
  v_total_amount numeric(12,2);
  v_total_discount numeric(12,2);
  v_count integer;
  v_i integer;
  v_gross numeric(12,2);
  v_due_date date;
  v_first_due date;
  v_effective_start date;
  v_due_day integer;
  v_discount_part numeric(12,2);
  v_discount_used numeric(12,2):=0;
  v_installments jsonb;
  v_result jsonb;
  v_created integer:=0;
  v_deposit_amount numeric(12,2);
begin
  if v_institute is null then raise exception 'FEES_UNAUTHORIZED'; end if;
  select s.*,ay.start_date as year_start,ay.end_date as year_end into v_student
  from public.students s cross join public.academic_years ay
  where s.id=p_student_id and s.institute_id=v_institute and s.status='Active'
    and ay.id=(select academic_year_id from public.class_fee_structures where id=p_structure_id and institute_id=v_institute)
    and ay.institute_id=v_institute;
  select * into v_structure from public.class_fee_structures where id=p_structure_id and institute_id=v_institute and is_active is true;
  if not found or v_student.id is null then raise exception 'FEES_STRUCTURE_REFERENCE_INVALID'; end if;
  if p_overrides is null then p_overrides:='[]'::jsonb; end if;
  if jsonb_typeof(p_overrides)<>'array' then raise exception 'FEES_STRUCTURE_SELECTION_INVALID'; end if;
  if (select count(*) from jsonb_array_elements(p_overrides))<>(select count(distinct value->>'itemId') from jsonb_array_elements(p_overrides) value) then raise exception 'FEES_STRUCTURE_OVERRIDE_DUPLICATE'; end if;
  if exists(select 1 from jsonb_array_elements(p_overrides) value where not exists(select 1 from public.class_fee_structure_items i where i.id=(value->>'itemId')::uuid and i.class_fee_structure_id=v_structure.id and i.institute_id=v_institute)) then raise exception 'FEES_STRUCTURE_OVERRIDE_INVALID'; end if;
  v_due_day:=coalesce((select default_monthly_due_day from public.fee_settings where institute_id=v_institute),15);
  v_effective_start:=greatest(v_student.admission_date,v_student.year_start);
  v_deposit_amount:=public.class_monthly_fee_on_date(v_structure.id,v_student.admission_date);

  for v_item in select i.*,fh.fee_nature from public.class_fee_structure_items i join public.fee_heads fh on fh.id=i.fee_head_id and fh.institute_id=i.institute_id where i.class_fee_structure_id=v_structure.id order by i.display_order,i.id loop
    select value into v_override from jsonb_array_elements(p_overrides) value where value->>'itemId'=v_item.id::text limit 1;
    v_include:=coalesce((v_override->>'include')::boolean,true);
    if v_item.is_mandatory and not v_include then raise exception 'FEES_MANDATORY_ITEM_REQUIRED'; end if;
    if not v_include then continue; end if;

    if v_item.fee_nature='refundable_deposit' then
      if v_deposit_amount<=0 then raise exception 'FEES_SECURITY_DEPOSIT_BASE_MISSING'; end if;
      v_amount:=v_deposit_amount;
      v_discount_type:=null;
      v_discount_value:=0;
      v_total_amount:=v_deposit_amount;
      v_total_discount:=0;
      v_installments:=jsonb_build_array(jsonb_build_object('installment_no',1,'due_date',v_student.admission_date,'gross_amount',v_deposit_amount,'discount_amount',0,'net_amount',v_deposit_amount));
    else
      v_amount:=coalesce((v_override->>'amount')::numeric,v_item.amount);
      v_discount_type:=coalesce(nullif(v_override->>'discountType',''),v_item.default_discount_type);
      v_discount_value:=coalesce((v_override->>'discountValue')::numeric,v_item.default_discount_value,0);
      if v_amount<=0 then raise exception 'FEES_STRUCTURE_ITEM_INVALID'; end if;
      v_unit_discount:=case when v_discount_type is null then 0 when v_discount_type='fixed' then v_discount_value when v_discount_type='percentage' then round(v_amount*v_discount_value/100,2) else -1 end;
      if v_unit_discount<0 or v_unit_discount>v_amount or (v_discount_type='percentage' and v_discount_value>100) then raise exception 'FEES_DISCOUNT_INVALID'; end if;
      v_installments:='[]'::jsonb; v_discount_used:=0;
      if v_item.schedule_type='monthly' then
        v_first_due:=(date_trunc('month',v_effective_start)::date+(v_due_day-1));
        if v_first_due<v_effective_start then v_first_due:=(v_first_due+interval '1 month')::date; end if;
        if v_first_due>v_student.year_end then raise exception 'FEES_NO_APPLICABLE_MONTHS'; end if;
        v_count:=((date_part('year',age(date_trunc('month',v_student.year_end),date_trunc('month',v_first_due)))*12)+date_part('month',age(date_trunc('month',v_student.year_end),date_trunc('month',v_first_due))))::integer+1;
        v_total_amount:=v_amount*v_count;
        v_total_discount:=v_unit_discount*v_count;
        for v_i in 1..v_count loop
          v_due_date:=(v_first_due+(v_i-1)*interval '1 month')::date;
          v_installments:=v_installments||jsonb_build_array(jsonb_build_object('installment_no',v_i,'due_date',v_due_date,'gross_amount',v_amount,'discount_amount',v_unit_discount,'net_amount',v_amount-v_unit_discount));
        end loop;
      else
        select count(*) into v_count from public.class_fee_structure_installments where class_fee_structure_item_id=v_item.id;
        if v_count=0 then raise exception 'FEES_INSTALLMENTS_REQUIRED'; end if;
        v_total_amount:=v_amount;
        v_total_discount:=v_unit_discount;
        for v_i in 1..v_count loop
          select case when v_i=v_count then v_amount-coalesce((select sum(round(v_amount*ci.gross_amount/v_item.amount,2)) from public.class_fee_structure_installments ci where ci.class_fee_structure_item_id=v_item.id and ci.installment_no<v_i),0) else round(v_amount*ci.gross_amount/v_item.amount,2) end,ci.due_date into v_gross,v_due_date from public.class_fee_structure_installments ci where ci.class_fee_structure_item_id=v_item.id and ci.installment_no=v_i;
          if v_gross is null or v_due_date is null then raise exception 'FEES_INSTALLMENT_INVALID'; end if;
          v_discount_part:=case when v_i=v_count then v_total_discount-v_discount_used else round(v_total_discount*v_gross/v_total_amount,2) end;
          v_discount_used:=v_discount_used+v_discount_part;
          v_installments:=v_installments||jsonb_build_array(jsonb_build_object('installment_no',v_i,'due_date',v_due_date,'gross_amount',v_gross,'discount_amount',v_discount_part,'net_amount',v_gross-v_discount_part));
        end loop;
      end if;
    end if;

    select public.create_student_fee_assignment(
      p_student_id,v_structure.academic_year_id,v_item.fee_head_id,v_total_amount,v_discount_type,
      case when v_discount_type='fixed' then v_total_discount else v_discount_value end,
      case when v_item.schedule_type='monthly' then v_effective_start else null end,
      case when v_item.schedule_type='monthly' then v_student.year_end else null end,
      v_installments
    ) into v_result;
    update public.student_fee_assignments set class_fee_structure_item_id=v_item.id,fee_nature_snapshot=v_item.fee_nature,updated_at=now() where id=(v_result->>'assignmentId')::uuid and institute_id=v_institute;
    v_created:=v_created+1;
  end loop;
  return jsonb_build_object('structureId',v_structure.id,'assignmentCount',v_created,'securityDepositAmount',v_deposit_amount);
end $$;

create or replace function public.update_class_fee_rates(p_structure_id uuid,p_effective_from date,p_apply_existing boolean,p_rates jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_institute uuid:=public.fee_admin_institute_id();
  v_structure record;
  v_rate record;
  v_item record;
  v_affected integer:=0;
  v_total_affected integer:=0;
  v_deposit record;
  v_deposit_new numeric(12,2);
begin
  if v_institute is null then raise exception 'FEES_UNAUTHORIZED'; end if;
  if p_effective_from is null then raise exception 'FEES_RATE_EFFECTIVE_DATE_REQUIRED'; end if;
  if p_rates is null or jsonb_typeof(p_rates)<>'array' or jsonb_array_length(p_rates)=0 then raise exception 'FEES_RATE_ITEMS_REQUIRED'; end if;
  select id,academic_year_id,class_id into v_structure from public.class_fee_structures where id=p_structure_id and institute_id=v_institute for update;
  if not found then raise exception 'FEES_STRUCTURE_NOT_FOUND'; end if;

  for v_rate in select * from jsonb_to_recordset(p_rates) as x(item_id uuid,amount numeric) loop
    select i.*,fh.fee_nature into v_item from public.class_fee_structure_items i join public.fee_heads fh on fh.id=i.fee_head_id and fh.institute_id=i.institute_id where i.id=v_rate.item_id and i.class_fee_structure_id=p_structure_id and i.institute_id=v_institute for update of i;
    if not found then raise exception 'FEES_STRUCTURE_OVERRIDE_INVALID'; end if;
    if v_item.fee_nature='refundable_deposit' then continue; end if;
    if v_rate.amount is null or v_rate.amount<=0 then raise exception 'FEES_STRUCTURE_ITEM_INVALID'; end if;
    v_affected:=0;
    if p_apply_existing and v_item.schedule_type='monthly' then
      with eligible as (
        select d.id,d.net_amount,public.fee_due_outstanding(d.id) as outstanding
        from public.student_fee_dues d
        join public.student_academics sa on sa.student_id=d.student_id and sa.academic_year_id=d.academic_year_id and sa.class_id=v_structure.class_id
        where d.institute_id=v_institute and d.academic_year_id=v_structure.academic_year_id and d.fee_head_id=v_item.fee_head_id and d.due_date>=p_effective_from and d.status in('due','partially_paid')
      ), updated as (
        update public.student_fee_dues d set gross_amount=greatest(v_rate.amount,e.net_amount-e.outstanding),discount_amount=0,net_amount=greatest(v_rate.amount,e.net_amount-e.outstanding),updated_at=now() from eligible e where d.id=e.id returning d.id
      ) select count(*) into v_affected from updated;
      perform public.fee_recalculate_due_status(d.id) from public.student_fee_dues d join public.student_academics sa on sa.student_id=d.student_id and sa.academic_year_id=d.academic_year_id and sa.class_id=v_structure.class_id where d.institute_id=v_institute and d.academic_year_id=v_structure.academic_year_id and d.fee_head_id=v_item.fee_head_id and d.due_date>=p_effective_from;
    end if;
    if v_item.amount<>v_rate.amount then
      update public.class_fee_structure_items set amount=v_rate.amount,updated_at=now() where id=v_item.id;
      insert into public.class_fee_rate_changes(institute_id,class_fee_structure_id,class_fee_structure_item_id,old_amount,new_amount,effective_from,apply_existing,affected_due_count,changed_by)
      values(v_institute,p_structure_id,v_item.id,v_item.amount,v_rate.amount,p_effective_from,p_apply_existing,v_affected,(select auth.uid()));
    end if;
    v_total_affected:=v_total_affected+v_affected;
  end loop;

  select coalesce(sum(i.amount),0) into v_deposit_new from public.class_fee_structure_items i join public.fee_heads fh on fh.id=i.fee_head_id and fh.institute_id=i.institute_id where i.class_fee_structure_id=p_structure_id and i.schedule_type='monthly' and fh.fee_nature<>'refundable_deposit';
  if v_deposit_new<=0 then raise exception 'FEES_SECURITY_DEPOSIT_BASE_MISSING'; end if;
  for v_deposit in select i.* from public.class_fee_structure_items i join public.fee_heads fh on fh.id=i.fee_head_id and fh.institute_id=i.institute_id where i.class_fee_structure_id=p_structure_id and fh.fee_nature='refundable_deposit' for update of i loop
    if v_deposit.amount<>v_deposit_new then
      update public.class_fee_structure_items set amount=v_deposit_new,updated_at=now() where id=v_deposit.id;
      insert into public.class_fee_rate_changes(institute_id,class_fee_structure_id,class_fee_structure_item_id,old_amount,new_amount,effective_from,apply_existing,affected_due_count,changed_by)
      values(v_institute,p_structure_id,v_deposit.id,v_deposit.amount,v_deposit_new,p_effective_from,false,0,(select auth.uid()));
    end if;
  end loop;
  update public.class_fee_structures set updated_at=now(),updated_by=(select auth.uid()) where id=p_structure_id;
  return jsonb_build_object('structureId',p_structure_id,'affectedDueCount',v_total_affected,'applyExisting',p_apply_existing,'effectiveFrom',p_effective_from,'securityDepositForNewAdmissions',v_deposit_new);
end $$;

revoke all on function public.class_fee_item_amount_on_date(uuid,date) from public,anon;
revoke all on function public.class_monthly_fee_on_date(uuid,date) from public,anon;
revoke all on function public.update_class_fee_rates(uuid,date,boolean,jsonb) from public,anon;
grant execute on function public.update_class_fee_rates(uuid,date,boolean,jsonb) to authenticated;
