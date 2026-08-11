BEGIN;

DO $$
DECLARE
  v_profile uuid;
  v_institute uuid;
  v_class uuid;
  v_regular uuid;
  v_percent uuid;
  v_deposit uuid;
  v_mode uuid;
  v_year uuid:=gen_random_uuid();
  v_structure uuid;
  v_before uuid:=gen_random_uuid();
  v_on uuid:=gen_random_uuid();
  v_after uuid:=gen_random_uuid();
  v_due uuid;
  v_payment jsonb;
  v_other_institute uuid:=gen_random_uuid();
  v_other_year uuid:=gen_random_uuid();
  v_other_class uuid:=gen_random_uuid();
  v_other_structure uuid:=gen_random_uuid();
  v_cross_blocked boolean:=false;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fee_settings' AND column_name='default_monthly_due_day' AND column_default='15') THEN RAISE EXCEPTION 'Monthly due-day setting missing'; END IF;
  SELECT p.id,p.institute_id INTO v_profile,v_institute FROM public.profiles p WHERE p.is_active IS TRUE AND p.role IN('admin','Super Admin','Institute Admin') AND p.institute_id IS NOT NULL LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub',v_profile::text,true); PERFORM set_config('request.jwt.claim.role','authenticated',true);
  SELECT id INTO v_class FROM public.academic_classes WHERE institute_id=v_institute LIMIT 1;
  SELECT id INTO v_regular FROM public.fee_heads WHERE institute_id=v_institute AND is_active AND fee_nature='regular' LIMIT 1;
  SELECT id INTO v_percent FROM public.fee_heads WHERE institute_id=v_institute AND is_active AND fee_nature='regular' AND id<>v_regular LIMIT 1;
  SELECT id INTO v_deposit FROM public.fee_heads WHERE institute_id=v_institute AND is_active AND fee_nature='refundable_deposit' LIMIT 1;
  SELECT id INTO v_mode FROM public.payment_modes WHERE institute_id=v_institute AND is_active LIMIT 1;
  IF v_profile IS NULL OR v_class IS NULL OR v_regular IS NULL OR v_percent IS NULL OR v_deposit IS NULL OR v_mode IS NULL THEN RAISE EXCEPTION 'Required Fees test fixtures unavailable'; END IF;
  INSERT INTO public.academic_years(id,institute_id,name,start_date,end_date,is_current,is_active) VALUES(v_year,v_institute,'CODEX MONTHLY 2098','2098-04-01','2099-03-31',false,true);
  INSERT INTO public.students(id,institute_id,admission_no,gender,date_of_birth,mobile,email,name,admission_date,status)
  VALUES
    (v_before,v_institute,'CODEX/MONTHLY/BEFORE','Male','2010-01-01','9000000001','codex-before@example.invalid','CODEX BEFORE','2098-04-14','Active'),
    (v_on,v_institute,'CODEX/MONTHLY/ON','Male','2010-01-01','9000000002','codex-on@example.invalid','CODEX ON','2098-04-15','Active'),
    (v_after,v_institute,'CODEX/MONTHLY/AFTER','Male','2010-01-01','9000000003','codex-after@example.invalid','CODEX AFTER','2098-04-16','Active');
  INSERT INTO public.fee_settings(institute_id) VALUES(v_institute) ON CONFLICT(institute_id) DO UPDATE SET default_monthly_due_day=15;
  v_structure:=public.save_class_fee_structure(NULL,v_year,v_class,'CODEX MONTHLY SEMANTICS',true,jsonb_build_array(
    jsonb_build_object('fee_head_id',v_regular,'amount',1100,'is_mandatory',true,'discount_type','fixed','discount_value',100,'schedule_type','monthly','display_order',1,'start_due_date',NULL,'installments','[]'::jsonb),
    jsonb_build_object('fee_head_id',v_percent,'amount',1100,'is_mandatory',true,'discount_type','percentage','discount_value',10,'schedule_type','monthly','display_order',2,'start_due_date',NULL,'installments','[]'::jsonb),
    jsonb_build_object('fee_head_id',v_deposit,'amount',500,'is_mandatory',true,'discount_type',NULL,'discount_value',0,'schedule_type','one_time','display_order',3,'start_due_date','2098-04-15','installments','[]'::jsonb)
  ));
  IF EXISTS(SELECT 1 FROM public.class_fee_structure_installments ci JOIN public.class_fee_structure_items i ON i.id=ci.class_fee_structure_item_id WHERE i.class_fee_structure_id=v_structure AND i.schedule_type='monthly') THEN RAISE EXCEPTION 'Monthly template installments must not be persisted'; END IF;
  PERFORM public.apply_class_fee_structure(v_before,v_structure,'[]'::jsonb);
  PERFORM public.apply_class_fee_structure(v_on,v_structure,'[]'::jsonb);
  PERFORM public.apply_class_fee_structure(v_after,v_structure,'[]'::jsonb);
  IF (SELECT count(*) FROM public.student_fee_dues WHERE student_id=v_before AND fee_head_id=v_regular)<>12 THEN RAISE EXCEPTION 'Before-15 admission count invalid'; END IF;
  IF (SELECT count(*) FROM public.student_fee_dues WHERE student_id=v_on AND fee_head_id=v_regular)<>12 THEN RAISE EXCEPTION 'On-15 admission count invalid'; END IF;
  IF (SELECT count(*) FROM public.student_fee_dues WHERE student_id=v_after AND fee_head_id=v_regular)<>11 THEN RAISE EXCEPTION 'After-15 admission count invalid'; END IF;
  IF EXISTS(SELECT 1 FROM public.student_fee_dues WHERE student_id IN(v_before,v_on,v_after) AND fee_head_id IN(v_regular,v_percent) AND (gross_amount<>1100 OR extract(day from due_date)<>15 OR due_date<'2098-04-01' OR due_date>'2099-03-31')) THEN RAISE EXCEPTION 'Monthly amount/day/year bounds invalid'; END IF;
  IF EXISTS(SELECT 1 FROM public.student_fee_dues WHERE student_id=v_before AND fee_head_id=v_regular AND (discount_amount<>100 OR net_amount<>1000)) THEN RAISE EXCEPTION 'Fixed monthly discount invalid'; END IF;
  IF EXISTS(SELECT 1 FROM public.student_fee_dues WHERE student_id=v_before AND fee_head_id=v_percent AND (discount_amount<>110 OR net_amount<>990)) THEN RAISE EXCEPTION 'Percentage monthly discount invalid'; END IF;
  IF (SELECT count(*) FROM public.student_fee_dues WHERE student_id=v_before AND fee_head_id=v_deposit)<>1 THEN RAISE EXCEPTION 'One-time Security Deposit count invalid'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.student_fee_assignments WHERE student_id=v_before AND fee_head_id=v_deposit AND fee_nature_snapshot='refundable_deposit') THEN RAISE EXCEPTION 'Security Deposit snapshot invalid'; END IF;
  INSERT INTO public.institutes(id,name) VALUES(v_other_institute,'CODEX OTHER INSTITUTE');
  INSERT INTO public.academic_years(id,institute_id,name,start_date,end_date,is_current,is_active) VALUES(v_other_year,v_other_institute,'CODEX OTHER YEAR','2098-04-01','2099-03-31',false,true);
  INSERT INTO public.academic_classes(id,institute_id,class_name,display_order) VALUES(v_other_class,v_other_institute,'CODEX OTHER CLASS',9999);
  INSERT INTO public.class_fee_structures(id,institute_id,academic_year_id,class_id,name,is_active,created_by) VALUES(v_other_structure,v_other_institute,v_other_year,v_other_class,'CODEX CROSS TENANT',true,v_profile);
  BEGIN
    PERFORM public.apply_class_fee_structure(v_before,v_other_structure,'[]'::jsonb);
  EXCEPTION WHEN OTHERS THEN v_cross_blocked:=SQLERRM LIKE '%FEES_STRUCTURE_REFERENCE_INVALID%'; END;
  IF NOT v_cross_blocked THEN RAISE EXCEPTION 'Invalid/cross-tenant structure was not blocked'; END IF;
  SELECT id INTO v_due FROM public.student_fee_dues WHERE student_id=v_before AND fee_head_id=v_regular ORDER BY installment_no LIMIT 1;
  SELECT public.post_fee_payment(v_before,v_year,v_mode,now(),NULL,'MONTHLY TEST',jsonb_build_array(jsonb_build_object('due_id',v_due,'amount',1000))) INTO v_payment;
  IF public.fee_due_outstanding(v_due)<>0 THEN RAISE EXCEPTION 'Payment balance invalid'; END IF;
  PERFORM public.reverse_fee_payment((v_payment->>'paymentId')::uuid,'MONTHLY TEST REVERSAL');
  IF public.fee_due_outstanding(v_due)<>1000 THEN RAISE EXCEPTION 'Reversal balance invalid'; END IF;
END $$;

ROLLBACK;
