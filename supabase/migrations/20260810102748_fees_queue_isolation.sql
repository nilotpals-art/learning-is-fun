BEGIN;

CREATE OR REPLACE FUNCTION public.post_fee_payment(p_student_id uuid,p_academic_year_id uuid,p_payment_mode_id uuid,p_payment_date timestamptz,p_reference_no text,p_remarks text,p_allocations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_institute uuid:=public.fee_admin_institute_id(); v_profile uuid:=(SELECT auth.uid()); v_total numeric(12,2); v_payment uuid; v_receipt text; v_sequence bigint; v_year text; v_item record; v_due record; v_outstanding numeric; v_whatsapp text:='not_queued';
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  IF p_payment_mode_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.payment_modes WHERE id=p_payment_mode_id AND institute_id=v_institute AND is_active IS TRUE) THEN RAISE EXCEPTION 'FEES_PAYMENT_MODE_INVALID'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.students WHERE id=p_student_id AND institute_id=v_institute) OR NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=p_academic_year_id AND institute_id=v_institute) THEN RAISE EXCEPTION 'FEES_REFERENCE_INVALID'; END IF;
  IF jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)=0 THEN RAISE EXCEPTION 'FEES_ALLOCATIONS_REQUIRED'; END IF;
  IF (SELECT count(*) FROM jsonb_to_recordset(p_allocations) AS x(due_id uuid,amount numeric))<>(SELECT count(DISTINCT due_id) FROM jsonb_to_recordset(p_allocations) AS x(due_id uuid,amount numeric)) THEN RAISE EXCEPTION 'FEES_ALLOCATION_DUPLICATE'; END IF;
  SELECT COALESCE(sum(amount),0) INTO v_total FROM jsonb_to_recordset(p_allocations) AS x(due_id uuid,amount numeric);
  IF v_total<=0 THEN RAISE EXCEPTION 'FEES_PAYMENT_AMOUNT_INVALID'; END IF;
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_allocations) AS x(due_id uuid,amount numeric) LOOP
    SELECT * INTO v_due FROM public.student_fee_dues WHERE id=v_item.due_id AND institute_id=v_institute FOR UPDATE;
    IF NOT FOUND OR v_due.student_id<>p_student_id OR v_due.academic_year_id<>p_academic_year_id OR v_due.status IN ('waived','cancelled') THEN RAISE EXCEPTION 'FEES_DUE_INVALID'; END IF;
    SELECT public.fee_due_outstanding(v_due.id) INTO v_outstanding;
    IF v_item.amount<=0 OR v_item.amount>v_outstanding THEN RAISE EXCEPTION 'FEES_ALLOCATION_EXCEEDS_OUTSTANDING'; END IF;
  END LOOP;
  INSERT INTO public.fee_receipt_sequences(institute_id,academic_year_id,last_value) VALUES(v_institute,p_academic_year_id,1)
  ON CONFLICT(institute_id,academic_year_id) DO UPDATE SET last_value=public.fee_receipt_sequences.last_value+1,updated_at=now() RETURNING last_value INTO v_sequence;
  SELECT name INTO v_year FROM public.academic_years WHERE id=p_academic_year_id;
  v_receipt := 'LIF/'||v_year||'/'||lpad(v_sequence::text,6,'0');
  INSERT INTO public.fee_payments(institute_id,student_id,academic_year_id,payment_date,amount,payment_mode_id,reference_no,remarks,receipt_no,received_by)
  VALUES(v_institute,p_student_id,p_academic_year_id,COALESCE(p_payment_date,now()),v_total,p_payment_mode_id,NULLIF(btrim(p_reference_no),''),NULLIF(btrim(p_remarks),''),v_receipt,v_profile) RETURNING id INTO v_payment;
  INSERT INTO public.fee_payment_allocations(institute_id,fee_payment_id,student_fee_due_id,amount)
  SELECT v_institute,v_payment,x.due_id,x.amount FROM jsonb_to_recordset(p_allocations) AS x(due_id uuid,amount numeric);
  FOR v_item IN SELECT DISTINCT due_id FROM jsonb_to_recordset(p_allocations) AS x(due_id uuid,amount numeric) LOOP PERFORM public.fee_recalculate_due_status(v_item.due_id); END LOOP;
  BEGIN
    SELECT public.fee_queue_confirmation(v_payment,v_institute,p_student_id,v_profile) INTO v_whatsapp;
  EXCEPTION WHEN OTHERS THEN
    v_whatsapp := 'queue_failed';
  END;
  RETURN jsonb_build_object('paymentId',v_payment,'receiptNo',v_receipt,'amount',v_total,'whatsappStatus',v_whatsapp);
END $$;

REVOKE ALL ON FUNCTION public.post_fee_payment(uuid,uuid,uuid,timestamptz,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.post_fee_payment(uuid,uuid,uuid,timestamptz,text,text,jsonb) TO authenticated;

COMMIT;
