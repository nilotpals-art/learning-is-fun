create or replace function public.fee_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_institute uuid := public.fee_admin_institute_id();
  v_month_end date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
begin
  if v_institute is null then
    raise exception 'FEES_UNAUTHORIZED';
  end if;

  return jsonb_build_object(
    'totalOutstanding', (
      select coalesce(sum(public.fee_due_outstanding(d.id)), 0)
      from public.student_fee_dues d
      join public.student_fee_assignments a on a.id = d.student_fee_assignment_id
      join public.class_fee_structure_items i on i.id = a.class_fee_structure_item_id
      where d.institute_id = v_institute
        and d.status in ('due', 'partially_paid')
        and d.due_date <= v_month_end
        and i.schedule_type = 'monthly'
        and public.fee_due_outstanding(d.id) > 0
    ),
    'collectionsToday', (
      select coalesce(sum(amount), 0)
      from public.fee_payments
      where institute_id = v_institute
        and status = 'posted'
        and payment_date::date = current_date
    ),
    'collectionsThisMonth', (
      select coalesce(sum(amount), 0)
      from public.fee_payments
      where institute_id = v_institute
        and status = 'posted'
        and date_trunc('month', payment_date) = date_trunc('month', current_date)
    ),
    'studentsOutstanding', (
      select count(distinct d.student_id)
      from public.student_fee_dues d
      join public.student_fee_assignments a on a.id = d.student_fee_assignment_id
      join public.class_fee_structure_items i on i.id = a.class_fee_structure_item_id
      where d.institute_id = v_institute
        and d.status in ('due', 'partially_paid')
        and d.due_date <= v_month_end
        and i.schedule_type = 'monthly'
        and public.fee_due_outstanding(d.id) > 0
    ),
    'overdueCount', (
      select count(*)
      from public.student_fee_dues d
      join public.student_fee_assignments a on a.id = d.student_fee_assignment_id
      join public.class_fee_structure_items i on i.id = a.class_fee_structure_item_id
      where d.institute_id = v_institute
        and d.status in ('due', 'partially_paid')
        and d.due_date < current_date
        and d.due_date <= v_month_end
        and i.schedule_type = 'monthly'
        and public.fee_due_outstanding(d.id) > 0
    ),
    'queuedMessages', (
      select count(*)
      from public.fee_message_outbox
      where institute_id = v_institute
        and status = 'queued'
    )
  );
end
$function$;
