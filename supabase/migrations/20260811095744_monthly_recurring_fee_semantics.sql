BEGIN;

ALTER TABLE public.fee_settings
  ADD COLUMN default_monthly_due_day integer NOT NULL DEFAULT 15,
  ADD CONSTRAINT fee_settings_monthly_due_day_check
    CHECK (default_monthly_due_day BETWEEN 1 AND 28);

CREATE OR REPLACE FUNCTION public.save_class_fee_structure(
  p_structure_id uuid,
  p_academic_year_id uuid,
  p_class_id uuid,
  p_name text,
  p_is_active boolean,
  p_items jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_institute uuid:=public.fee_admin_institute_id();
  v_profile uuid:=(SELECT auth.uid());
  v_id uuid;
  v_item record;
  v_item_id uuid;
  v_year_start date;
  v_count integer;
  v_base numeric(12,2);
  v_last numeric(12,2);
  v_i integer;
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  IF length(btrim(COALESCE(p_name,'')))=0 THEN RAISE EXCEPTION 'FEES_STRUCTURE_NAME_REQUIRED'; END IF;
  SELECT start_date INTO v_year_start FROM public.academic_years WHERE id=p_academic_year_id AND institute_id=v_institute AND is_active IS TRUE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.academic_classes WHERE id=p_class_id AND institute_id=v_institute) THEN RAISE EXCEPTION 'FEES_STRUCTURE_REFERENCE_INVALID'; END IF;
  IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'FEES_STRUCTURE_ITEMS_REQUIRED'; END IF;
  IF p_structure_id IS NULL THEN
    INSERT INTO public.class_fee_structures(institute_id,academic_year_id,class_id,name,is_active,created_by)
    VALUES(v_institute,p_academic_year_id,p_class_id,upper(btrim(p_name)),p_is_active,v_profile) RETURNING id INTO v_id;
  ELSE
    SELECT id INTO v_id FROM public.class_fee_structures WHERE id=p_structure_id AND institute_id=v_institute FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'FEES_STRUCTURE_NOT_FOUND'; END IF;
    IF EXISTS(SELECT 1 FROM public.student_fee_assignments a JOIN public.class_fee_structure_items i ON i.id=a.class_fee_structure_item_id WHERE i.class_fee_structure_id=v_id) THEN RAISE EXCEPTION 'FEES_STRUCTURE_IN_USE'; END IF;
    UPDATE public.class_fee_structures SET academic_year_id=p_academic_year_id,class_id=p_class_id,name=upper(btrim(p_name)),is_active=p_is_active,updated_by=v_profile,updated_at=now() WHERE id=v_id;
    DELETE FROM public.class_fee_structure_installments WHERE class_fee_structure_item_id IN(SELECT id FROM public.class_fee_structure_items WHERE class_fee_structure_id=v_id);
    DELETE FROM public.class_fee_structure_items WHERE class_fee_structure_id=v_id;
  END IF;
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(fee_head_id uuid,amount numeric,is_mandatory boolean,discount_type text,discount_value numeric,schedule_type text,display_order integer,start_due_date date,installments jsonb) LOOP
    IF v_item.amount<=0 OR v_item.schedule_type NOT IN('one_time','monthly','quarterly','custom') THEN RAISE EXCEPTION 'FEES_STRUCTURE_ITEM_INVALID'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.fee_heads WHERE id=v_item.fee_head_id AND institute_id=v_institute AND is_active IS TRUE) THEN RAISE EXCEPTION 'FEES_STRUCTURE_FEE_HEAD_INVALID'; END IF;
    INSERT INTO public.class_fee_structure_items(institute_id,class_fee_structure_id,fee_head_id,amount,is_mandatory,default_discount_type,default_discount_value,schedule_type,display_order)
    VALUES(v_institute,v_id,v_item.fee_head_id,v_item.amount,COALESCE(v_item.is_mandatory,true),v_item.discount_type,COALESCE(v_item.discount_value,0),v_item.schedule_type,COALESCE(v_item.display_order,1)) RETURNING id INTO v_item_id;
    IF v_item.schedule_type='monthly' THEN
      CONTINUE;
    ELSIF v_item.schedule_type='custom' THEN
      IF jsonb_typeof(v_item.installments)<>'array' OR jsonb_array_length(v_item.installments)=0 THEN RAISE EXCEPTION 'FEES_CUSTOM_INSTALLMENTS_REQUIRED'; END IF;
      INSERT INTO public.class_fee_structure_installments(institute_id,class_fee_structure_item_id,installment_no,due_date,gross_amount)
      SELECT v_institute,v_item_id,x.installment_no,x.due_date,x.gross_amount FROM jsonb_to_recordset(v_item.installments) AS x(installment_no integer,due_date date,gross_amount numeric);
      IF (SELECT COALESCE(sum(gross_amount),0) FROM public.class_fee_structure_installments WHERE class_fee_structure_item_id=v_item_id)<>v_item.amount THEN RAISE EXCEPTION 'FEES_INSTALLMENT_TOTAL_INVALID'; END IF;
    ELSE
      v_count:=CASE v_item.schedule_type WHEN 'quarterly' THEN 4 ELSE 1 END;
      v_base:=trunc(v_item.amount/v_count,2); v_last:=v_item.amount-(v_base*(v_count-1));
      FOR v_i IN 1..v_count LOOP
        INSERT INTO public.class_fee_structure_installments(institute_id,class_fee_structure_item_id,installment_no,due_date,gross_amount)
        VALUES(v_institute,v_item_id,v_i,COALESCE(v_item.start_due_date,v_year_start)+CASE WHEN v_item.schedule_type='quarterly' THEN (v_i-1)*interval '3 months' ELSE interval '0 day' END,CASE WHEN v_i=v_count THEN v_last ELSE v_base END);
      END LOOP;
    END IF;
  END LOOP;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.apply_class_fee_structure(p_student_id uuid,p_structure_id uuid,p_overrides jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
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
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  SELECT s.*,ay.start_date AS year_start,ay.end_date AS year_end INTO v_student
  FROM public.students s CROSS JOIN public.academic_years ay
  WHERE s.id=p_student_id AND s.institute_id=v_institute AND s.status='Active'
    AND ay.id=(SELECT academic_year_id FROM public.class_fee_structures WHERE id=p_structure_id AND institute_id=v_institute)
    AND ay.institute_id=v_institute;
  SELECT * INTO v_structure FROM public.class_fee_structures WHERE id=p_structure_id AND institute_id=v_institute AND is_active IS TRUE;
  IF NOT FOUND OR v_student.id IS NULL THEN RAISE EXCEPTION 'FEES_STRUCTURE_REFERENCE_INVALID'; END IF;
  IF p_overrides IS NULL THEN p_overrides:='[]'::jsonb; END IF;
  IF jsonb_typeof(p_overrides)<>'array' THEN RAISE EXCEPTION 'FEES_STRUCTURE_SELECTION_INVALID'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_overrides))<>(SELECT count(DISTINCT value->>'itemId') FROM jsonb_array_elements(p_overrides) value) THEN RAISE EXCEPTION 'FEES_STRUCTURE_OVERRIDE_DUPLICATE'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_overrides) value WHERE NOT EXISTS(SELECT 1 FROM public.class_fee_structure_items i WHERE i.id=(value->>'itemId')::uuid AND i.class_fee_structure_id=v_structure.id AND i.institute_id=v_institute)) THEN RAISE EXCEPTION 'FEES_STRUCTURE_OVERRIDE_INVALID'; END IF;
  v_due_day:=COALESCE((SELECT default_monthly_due_day FROM public.fee_settings WHERE institute_id=v_institute),15);
  v_effective_start:=GREATEST(v_student.admission_date,v_student.year_start);
  FOR v_item IN SELECT i.*,fh.fee_nature FROM public.class_fee_structure_items i JOIN public.fee_heads fh ON fh.id=i.fee_head_id AND fh.institute_id=i.institute_id WHERE i.class_fee_structure_id=v_structure.id ORDER BY i.display_order,i.id LOOP
    SELECT value INTO v_override FROM jsonb_array_elements(p_overrides) value WHERE value->>'itemId'=v_item.id::text LIMIT 1;
    v_include:=COALESCE((v_override->>'include')::boolean,true);
    IF v_item.is_mandatory AND NOT v_include THEN RAISE EXCEPTION 'FEES_MANDATORY_ITEM_REQUIRED'; END IF;
    IF NOT v_include THEN CONTINUE; END IF;
    v_amount:=COALESCE((v_override->>'amount')::numeric,v_item.amount);
    v_discount_type:=COALESCE(NULLIF(v_override->>'discountType',''),v_item.default_discount_type);
    v_discount_value:=COALESCE((v_override->>'discountValue')::numeric,v_item.default_discount_value,0);
    IF v_amount<=0 THEN RAISE EXCEPTION 'FEES_STRUCTURE_ITEM_INVALID'; END IF;
    v_unit_discount:=CASE WHEN v_discount_type IS NULL THEN 0 WHEN v_discount_type='fixed' THEN v_discount_value WHEN v_discount_type='percentage' THEN round(v_amount*v_discount_value/100,2) ELSE -1 END;
    IF v_unit_discount<0 OR v_unit_discount>v_amount OR (v_discount_type='percentage' AND v_discount_value>100) THEN RAISE EXCEPTION 'FEES_DISCOUNT_INVALID'; END IF;
    v_installments:='[]'::jsonb; v_discount_used:=0;
    IF v_item.schedule_type='monthly' THEN
      v_first_due:=(date_trunc('month',v_effective_start)::date+(v_due_day-1));
      IF v_first_due<v_effective_start THEN v_first_due:=(v_first_due+interval '1 month')::date; END IF;
      IF v_first_due>v_student.year_end THEN RAISE EXCEPTION 'FEES_NO_APPLICABLE_MONTHS'; END IF;
      v_count:=((date_part('year',age(date_trunc('month',v_student.year_end),date_trunc('month',v_first_due)))*12)+date_part('month',age(date_trunc('month',v_student.year_end),date_trunc('month',v_first_due))))::integer+1;
      v_total_amount:=v_amount*v_count;
      v_total_discount:=v_unit_discount*v_count;
      FOR v_i IN 1..v_count LOOP
        v_due_date:=(v_first_due+(v_i-1)*interval '1 month')::date;
        v_installments:=v_installments||jsonb_build_array(jsonb_build_object('installment_no',v_i,'due_date',v_due_date,'gross_amount',v_amount,'discount_amount',v_unit_discount,'net_amount',v_amount-v_unit_discount));
      END LOOP;
    ELSE
      SELECT count(*) INTO v_count FROM public.class_fee_structure_installments WHERE class_fee_structure_item_id=v_item.id;
      IF v_count=0 THEN RAISE EXCEPTION 'FEES_INSTALLMENTS_REQUIRED'; END IF;
      v_total_amount:=v_amount;
      v_total_discount:=v_unit_discount;
      FOR v_i IN 1..v_count LOOP
        SELECT CASE WHEN v_i=v_count THEN v_amount-COALESCE((SELECT sum(round(v_amount*ci.gross_amount/v_item.amount,2)) FROM public.class_fee_structure_installments ci WHERE ci.class_fee_structure_item_id=v_item.id AND ci.installment_no<v_i),0) ELSE round(v_amount*ci.gross_amount/v_item.amount,2) END,ci.due_date INTO v_gross,v_due_date FROM public.class_fee_structure_installments ci WHERE ci.class_fee_structure_item_id=v_item.id AND ci.installment_no=v_i;
        IF v_gross IS NULL OR v_due_date IS NULL THEN RAISE EXCEPTION 'FEES_INSTALLMENT_INVALID'; END IF;
        v_discount_part:=CASE WHEN v_i=v_count THEN v_total_discount-v_discount_used ELSE round(v_total_discount*v_gross/v_total_amount,2) END;
        v_discount_used:=v_discount_used+v_discount_part;
        v_installments:=v_installments||jsonb_build_array(jsonb_build_object('installment_no',v_i,'due_date',v_due_date,'gross_amount',v_gross,'discount_amount',v_discount_part,'net_amount',v_gross-v_discount_part));
      END LOOP;
    END IF;
    SELECT public.create_student_fee_assignment(
      p_student_id,v_structure.academic_year_id,v_item.fee_head_id,v_total_amount,v_discount_type,
      CASE WHEN v_discount_type='fixed' THEN v_total_discount ELSE v_discount_value END,
      CASE WHEN v_item.schedule_type='monthly' THEN v_effective_start ELSE NULL END,
      CASE WHEN v_item.schedule_type='monthly' THEN v_student.year_end ELSE NULL END,
      v_installments
    ) INTO v_result;
    UPDATE public.student_fee_assignments SET class_fee_structure_item_id=v_item.id,fee_nature_snapshot=v_item.fee_nature,updated_at=now() WHERE id=(v_result->>'assignmentId')::uuid AND institute_id=v_institute;
    v_created:=v_created+1;
  END LOOP;
  RETURN jsonb_build_object('structureId',v_structure.id,'assignmentCount',v_created);
END $$;

COMMIT;
