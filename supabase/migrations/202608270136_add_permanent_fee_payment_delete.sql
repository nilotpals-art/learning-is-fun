create or replace function public.delete_fee_payment(p_payment_id uuid, p_confirmation_receipt_no text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_institute uuid := public.fee_admin_institute_id();
  v_payment public.fee_payments%rowtype;
  v_due_ids uuid[];
  v_due_id uuid;
  v_credit numeric := 0;
  v_balance numeric := 0;
begin
  if v_institute is null then raise exception 'FEES_UNAUTHORIZED'; end if;

  select * into v_payment
  from public.fee_payments
  where id = p_payment_id and institute_id = v_institute
  for update;

  if not found then raise exception 'FEES_PAYMENT_NOT_FOUND'; end if;
  if upper(btrim(coalesce(p_confirmation_receipt_no,''))) <> upper(v_payment.receipt_no) then
    raise exception 'FEES_DELETE_CONFIRMATION_INVALID';
  end if;

  select array_agg(student_fee_due_id)
  into v_due_ids
  from public.fee_payment_allocations
  where institute_id = v_institute and fee_payment_id = p_payment_id;

  select coalesce(sum(amount),0)
  into v_credit
  from public.student_security_deposit_entries
  where institute_id = v_institute and source_payment_id = p_payment_id and entry_type = 'credit';

  if v_credit > 0 then
    select public.security_deposit_balance(v_payment.student_id) into v_balance;
    if v_balance - v_credit < 0 then
      raise exception 'SECURITY_DEPOSIT_PAYMENT_IN_USE';
    end if;
  end if;

  delete from public.fee_message_outbox
  where institute_id = v_institute and fee_payment_id = p_payment_id;

  delete from public.student_security_deposit_entries
  where institute_id = v_institute and source_payment_id = p_payment_id;

  delete from public.fee_payment_allocations
  where institute_id = v_institute and fee_payment_id = p_payment_id;

  delete from public.fee_payments
  where institute_id = v_institute and id = p_payment_id;

  if v_due_ids is not null then
    foreach v_due_id in array v_due_ids loop
      perform public.fee_recalculate_due_status(v_due_id);
    end loop;
  end if;

  return jsonb_build_object('paymentId', p_payment_id, 'receiptNo', v_payment.receipt_no, 'studentId', v_payment.student_id);
end;
$function$;

revoke all on function public.delete_fee_payment(uuid,text) from public;
grant execute on function public.delete_fee_payment(uuid,text) to authenticated;
