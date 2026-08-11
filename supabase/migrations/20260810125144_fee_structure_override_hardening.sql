BEGIN;

CREATE OR REPLACE FUNCTION public.apply_class_fee_structure(p_student_id uuid,p_structure_id uuid,p_overrides jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_institute uuid:=public.fee_admin_institute_id(); v_structure record; v_item record; v_override jsonb; v_override_installments jsonb; v_include boolean; v_amount numeric(12,2); v_discount_type text; v_discount_value numeric; v_discount numeric(12,2); v_count integer; v_i integer; v_gross numeric(12,2); v_due_date date; v_discount_part numeric(12,2); v_discount_used numeric(12,2):=0; v_installments jsonb; v_result jsonb; v_created integer:=0;
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  SELECT * INTO v_structure FROM public.class_fee_structures WHERE id=p_structure_id AND institute_id=v_institute AND is_active IS TRUE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.students WHERE id=p_student_id AND institute_id=v_institute) THEN RAISE EXCEPTION 'FEES_STRUCTURE_REFERENCE_INVALID'; END IF;
  IF p_overrides IS NULL THEN p_overrides:='[]'::jsonb; END IF;
  IF jsonb_typeof(p_overrides)<>'array' THEN RAISE EXCEPTION 'FEES_STRUCTURE_SELECTION_INVALID'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_overrides))<>(SELECT count(DISTINCT value->>'itemId') FROM jsonb_array_elements(p_overrides) value) THEN RAISE EXCEPTION 'FEES_STRUCTURE_OVERRIDE_DUPLICATE'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_overrides) value WHERE NOT EXISTS(SELECT 1 FROM public.class_fee_structure_items i WHERE i.id=(value->>'itemId')::uuid AND i.class_fee_structure_id=v_structure.id AND i.institute_id=v_institute)) THEN RAISE EXCEPTION 'FEES_STRUCTURE_OVERRIDE_INVALID'; END IF;
  FOR v_item IN SELECT i.*,fh.fee_nature FROM public.class_fee_structure_items i JOIN public.fee_heads fh ON fh.id=i.fee_head_id AND fh.institute_id=i.institute_id WHERE i.class_fee_structure_id=v_structure.id ORDER BY i.display_order,i.id LOOP
    SELECT value INTO v_override FROM jsonb_array_elements(p_overrides) value WHERE value->>'itemId'=v_item.id::text LIMIT 1;
    v_include:=COALESCE((v_override->>'include')::boolean,true);
    IF v_item.is_mandatory AND NOT v_include THEN RAISE EXCEPTION 'FEES_MANDATORY_ITEM_REQUIRED'; END IF;
    IF NOT v_include THEN CONTINUE; END IF;
    v_amount:=COALESCE((v_override->>'amount')::numeric,v_item.amount);
    v_discount_type:=COALESCE(NULLIF(v_override->>'discountType',''),v_item.default_discount_type);
    v_discount_value:=COALESCE((v_override->>'discountValue')::numeric,v_item.default_discount_value,0);
    v_override_installments:=v_override->'installments';
    IF v_amount<=0 THEN RAISE EXCEPTION 'FEES_STRUCTURE_ITEM_INVALID'; END IF;
    v_discount:=CASE WHEN v_discount_type IS NULL THEN 0 WHEN v_discount_type='fixed' THEN v_discount_value WHEN v_discount_type='percentage' THEN round(v_amount*v_discount_value/100,2) ELSE -1 END;
    IF v_discount<0 OR v_discount>v_amount OR (v_discount_type='percentage' AND v_discount_value>100) THEN RAISE EXCEPTION 'FEES_DISCOUNT_INVALID'; END IF;
    IF jsonb_typeof(v_override_installments)='array' AND jsonb_array_length(v_override_installments)>0 THEN
      SELECT count(*) INTO v_count FROM jsonb_to_recordset(v_override_installments) AS x("installmentNo" integer,"dueDate" date,"grossAmount" numeric);
      IF (SELECT COALESCE(sum("grossAmount"),0) FROM jsonb_to_recordset(v_override_installments) AS x("installmentNo" integer,"dueDate" date,"grossAmount" numeric))<>v_amount THEN RAISE EXCEPTION 'FEES_INSTALLMENT_TOTAL_INVALID'; END IF;
      IF EXISTS(SELECT 1 FROM jsonb_to_recordset(v_override_installments) AS x("installmentNo" integer,"dueDate" date,"grossAmount" numeric) WHERE "installmentNo"<=0 OR "dueDate" IS NULL OR "grossAmount"<=0) OR (SELECT count(DISTINCT "installmentNo") FROM jsonb_to_recordset(v_override_installments) AS x("installmentNo" integer))<>v_count THEN RAISE EXCEPTION 'FEES_INSTALLMENT_INVALID'; END IF;
    ELSE
      SELECT count(*) INTO v_count FROM public.class_fee_structure_installments WHERE class_fee_structure_item_id=v_item.id;
    END IF;
    v_installments:='[]'::jsonb; v_discount_used:=0;
    FOR v_i IN 1..v_count LOOP
      IF jsonb_typeof(v_override_installments)='array' AND jsonb_array_length(v_override_installments)>0 THEN
        SELECT x."grossAmount",x."dueDate" INTO v_gross,v_due_date FROM jsonb_to_recordset(v_override_installments) AS x("installmentNo" integer,"dueDate" date,"grossAmount" numeric) WHERE x."installmentNo"=v_i;
      ELSE
        SELECT CASE WHEN v_i=v_count THEN v_amount-COALESCE((SELECT sum(round(v_amount*ci.gross_amount/v_item.amount,2)) FROM public.class_fee_structure_installments ci WHERE ci.class_fee_structure_item_id=v_item.id AND ci.installment_no<v_i),0) ELSE round(v_amount*ci.gross_amount/v_item.amount,2) END,ci.due_date INTO v_gross,v_due_date FROM public.class_fee_structure_installments ci WHERE ci.class_fee_structure_item_id=v_item.id AND ci.installment_no=v_i;
      END IF;
      IF v_gross IS NULL OR v_due_date IS NULL THEN RAISE EXCEPTION 'FEES_INSTALLMENT_INVALID'; END IF;
      v_discount_part:=CASE WHEN v_i=v_count THEN v_discount-v_discount_used ELSE round(v_discount*v_gross/v_amount,2) END; v_discount_used:=v_discount_used+v_discount_part;
      v_installments:=v_installments||jsonb_build_array(jsonb_build_object('installment_no',v_i,'due_date',v_due_date,'gross_amount',v_gross,'discount_amount',v_discount_part,'net_amount',v_gross-v_discount_part));
    END LOOP;
    SELECT public.create_student_fee_assignment(p_student_id,v_structure.academic_year_id,v_item.fee_head_id,v_amount,v_discount_type,v_discount_value,NULL,NULL,v_installments) INTO v_result;
    UPDATE public.student_fee_assignments SET class_fee_structure_item_id=v_item.id,fee_nature_snapshot=v_item.fee_nature,updated_at=now() WHERE id=(v_result->>'assignmentId')::uuid AND institute_id=v_institute;
    v_created:=v_created+1;
  END LOOP;
  RETURN jsonb_build_object('structureId',v_structure.id,'assignmentCount',v_created);
END $$;

REVOKE ALL ON FUNCTION public.apply_class_fee_structure(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_class_fee_structure(uuid,uuid,jsonb) TO authenticated;

COMMIT;
