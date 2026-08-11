BEGIN;

ALTER TABLE public.student_fee_assignments
  ADD COLUMN institute_id uuid;

UPDATE public.student_fee_assignments a
SET institute_id = s.institute_id
FROM public.students s
WHERE s.id = a.student_id;

ALTER TABLE public.student_fee_assignments
  ALTER COLUMN institute_id SET NOT NULL,
  ALTER COLUMN discount_type DROP DEFAULT,
  ALTER COLUMN discount_value SET DEFAULT 0,
  ADD CONSTRAINT student_fee_assignments_institute_fkey
    FOREIGN KEY (institute_id) REFERENCES public.institutes(id) ON DELETE RESTRICT,
  ADD CONSTRAINT student_fee_assignments_id_institute_key UNIQUE (id, institute_id),
  ADD CONSTRAINT student_fee_assignments_amount_check CHECK (amount > 0),
  ADD CONSTRAINT student_fee_assignments_discount_type_check
    CHECK (discount_type IS NULL OR discount_type IN ('fixed', 'percentage')),
  ADD CONSTRAINT student_fee_assignments_discount_value_check
    CHECK (
      (discount_type IS NULL AND COALESCE(discount_value, 0) = 0)
      OR (discount_type = 'fixed' AND discount_value >= 0 AND discount_value <= amount)
      OR (discount_type = 'percentage' AND discount_value >= 0 AND discount_value <= 100)
    ),
  ADD CONSTRAINT student_fee_assignments_dates_check
    CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from);

CREATE UNIQUE INDEX student_fee_assignments_active_fee_key
  ON public.student_fee_assignments (institute_id, student_id, academic_year_id, fee_head_id)
  WHERE is_active IS TRUE;
CREATE INDEX student_fee_assignments_scope_idx
  ON public.student_fee_assignments (institute_id, student_id, academic_year_id);

ALTER TABLE public.fee_heads
  ADD CONSTRAINT fee_heads_id_institute_key UNIQUE (id, institute_id);
ALTER TABLE public.payment_modes
  ADD CONSTRAINT payment_modes_id_institute_key UNIQUE (id, institute_id);

CREATE TABLE public.student_fee_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL,
  student_fee_assignment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  academic_year_id uuid NOT NULL,
  fee_head_id uuid NOT NULL,
  installment_no integer NOT NULL CHECK (installment_no > 0),
  due_date date NOT NULL,
  gross_amount numeric(12,2) NOT NULL CHECK (gross_amount >= 0),
  discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  net_amount numeric(12,2) NOT NULL CHECK (net_amount >= 0 AND net_amount = gross_amount - discount_amount),
  status text NOT NULL DEFAULT 'due' CHECK (status IN ('due', 'partially_paid', 'paid', 'waived', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_fee_dues_assignment_fkey FOREIGN KEY (student_fee_assignment_id, institute_id)
    REFERENCES public.student_fee_assignments(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT student_fee_dues_institute_fkey FOREIGN KEY (institute_id)
    REFERENCES public.institutes(id) ON DELETE RESTRICT,
  CONSTRAINT student_fee_dues_unique_installment UNIQUE (student_fee_assignment_id, installment_no),
  CONSTRAINT student_fee_dues_id_institute_key UNIQUE (id, institute_id)
);

CREATE TABLE public.fee_receipt_sequences (
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  last_value bigint NOT NULL DEFAULT 0 CHECK (last_value >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institute_id, academic_year_id)
);

CREATE TABLE public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  payment_date timestamptz NOT NULL DEFAULT now(),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_mode_id uuid NOT NULL,
  reference_no text,
  remarks text,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed')),
  receipt_no text NOT NULL,
  received_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  reversed_at timestamptz,
  reversed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reversal_reason text,
  CONSTRAINT fee_payments_mode_fkey FOREIGN KEY (payment_mode_id, institute_id)
    REFERENCES public.payment_modes(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT fee_payments_receipt_unique UNIQUE (institute_id, receipt_no),
  CONSTRAINT fee_payments_id_institute_key UNIQUE (id, institute_id),
  CONSTRAINT fee_payments_reversal_check CHECK (
    (status = 'posted' AND reversed_at IS NULL AND reversed_by IS NULL AND reversal_reason IS NULL)
    OR (status = 'reversed' AND reversed_at IS NOT NULL AND reversed_by IS NOT NULL AND length(btrim(reversal_reason)) > 0)
  )
);

CREATE TABLE public.fee_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  fee_payment_id uuid NOT NULL,
  student_fee_due_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fee_payment_allocations_payment_fkey FOREIGN KEY (fee_payment_id, institute_id)
    REFERENCES public.fee_payments(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT fee_payment_allocations_due_fkey FOREIGN KEY (student_fee_due_id, institute_id)
    REFERENCES public.student_fee_dues(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT fee_payment_allocations_unique_due UNIQUE (fee_payment_id, student_fee_due_id)
);

CREATE TABLE public.fee_settings (
  institute_id uuid PRIMARY KEY REFERENCES public.institutes(id) ON DELETE CASCADE,
  whatsapp_fee_reminders_enabled boolean NOT NULL DEFAULT false,
  whatsapp_payment_confirmations_enabled boolean NOT NULL DEFAULT false,
  reminder_after_due_days integer NOT NULL DEFAULT 5 CHECK (reminder_after_due_days >= 0),
  repeat_every_days integer CHECK (repeat_every_days IS NULL OR repeat_every_days > 0),
  max_reminders_per_due integer CHECK (max_reminders_per_due IS NULL OR max_reminders_per_due > 0),
  recipient_preference text NOT NULL DEFAULT 'parent' CHECK (recipient_preference IN ('parent', 'student', 'both')),
  reminder_template_name text,
  confirmation_template_name text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fee_message_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  parent_id uuid REFERENCES public.parents(id) ON DELETE RESTRICT,
  fee_payment_id uuid,
  student_fee_due_id uuid,
  message_type text NOT NULL CHECK (message_type IN ('fee_reminder', 'payment_confirmation', 'payment_reversal')),
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel = 'whatsapp'),
  recipient_type text NOT NULL CHECK (recipient_type IN ('student', 'parent', 'none')),
  recipient_phone text,
  template_name text,
  template_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id text,
  last_error_code text,
  last_error_message text,
  initiated_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fee_message_outbox_payment_fkey FOREIGN KEY (fee_payment_id, institute_id)
    REFERENCES public.fee_payments(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT fee_message_outbox_due_fkey FOREIGN KEY (student_fee_due_id, institute_id)
    REFERENCES public.student_fee_dues(id, institute_id) ON DELETE RESTRICT,
  CONSTRAINT fee_message_outbox_idempotency_unique UNIQUE (institute_id, idempotency_key),
  CONSTRAINT fee_message_outbox_target_check CHECK (fee_payment_id IS NOT NULL OR student_fee_due_id IS NOT NULL)
);

CREATE INDEX student_fee_dues_scope_idx ON public.student_fee_dues (institute_id, student_id, academic_year_id, due_date);
CREATE INDEX student_fee_dues_overdue_idx ON public.student_fee_dues (institute_id, due_date, status) WHERE status IN ('due', 'partially_paid');
CREATE INDEX fee_payments_scope_date_idx ON public.fee_payments (institute_id, payment_date DESC);
CREATE INDEX fee_payments_student_idx ON public.fee_payments (institute_id, student_id, academic_year_id, payment_date DESC);
CREATE INDEX fee_payment_allocations_due_idx ON public.fee_payment_allocations (institute_id, student_fee_due_id);
CREATE INDEX fee_message_outbox_queue_idx ON public.fee_message_outbox (status, scheduled_for) WHERE status IN ('queued', 'failed');
CREATE INDEX fee_message_outbox_student_idx ON public.fee_message_outbox (institute_id, student_id, created_at DESC);

CREATE FUNCTION public.fee_admin_institute_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.institute_id FROM public.profiles p
  WHERE p.id = (SELECT auth.uid()) AND p.is_active IS TRUE
    AND p.role IN ('admin', 'Super Admin', 'Institute Admin')
  LIMIT 1
$$;

CREATE FUNCTION public.fee_student_id(p_institute_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT s.id FROM public.students s JOIN public.profiles p ON p.id = s.profile_id
  WHERE p.id = (SELECT auth.uid()) AND p.is_active IS TRUE AND p.role = 'Student'
    AND p.institute_id = p_institute_id AND s.institute_id = p_institute_id
  LIMIT 1
$$;

CREATE FUNCTION public.fee_parent_can_view_student(p_institute_id uuid, p_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parents pa
    JOIN public.profiles p ON p.id = pa.profile_id AND p.institute_id = pa.institute_id
    JOIN public.student_parent_links spl ON spl.parent_id = pa.id AND spl.institute_id = pa.institute_id
    WHERE p.id = (SELECT auth.uid()) AND p.is_active IS TRUE AND p.role = 'Parent'
      AND pa.is_active IS TRUE AND pa.institute_id = p_institute_id AND spl.student_id = p_student_id
  )
$$;

CREATE FUNCTION public.fee_due_outstanding(p_due_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT GREATEST(d.net_amount - COALESCE(SUM(a.amount) FILTER (WHERE p.status = 'posted'), 0), 0)
  FROM public.student_fee_dues d
  LEFT JOIN public.fee_payment_allocations a ON a.student_fee_due_id = d.id AND a.institute_id = d.institute_id
  LEFT JOIN public.fee_payments p ON p.id = a.fee_payment_id AND p.institute_id = a.institute_id
  WHERE d.id = p_due_id GROUP BY d.id, d.net_amount
$$;

CREATE FUNCTION public.create_student_fee_assignment(
  p_student_id uuid, p_academic_year_id uuid, p_fee_head_id uuid,
  p_amount numeric, p_discount_type text, p_discount_value numeric,
  p_effective_from date, p_effective_to date, p_installments jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_institute uuid := public.fee_admin_institute_id();
  v_assignment uuid;
  v_net numeric(12,2);
  v_discount numeric(12,2);
  v_gross_sum numeric(12,2);
  v_discount_sum numeric(12,2);
  v_net_sum numeric(12,2);
  v_count integer;
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'FEES_AMOUNT_INVALID'; END IF;
  IF p_discount_type IS NULL THEN v_discount := 0;
  ELSIF p_discount_type = 'fixed' AND p_discount_value BETWEEN 0 AND p_amount THEN v_discount := p_discount_value;
  ELSIF p_discount_type = 'percentage' AND p_discount_value BETWEEN 0 AND 100 THEN v_discount := round(p_amount * p_discount_value / 100, 2);
  ELSE RAISE EXCEPTION 'FEES_DISCOUNT_INVALID'; END IF;
  v_net := p_amount - v_discount;
  IF v_net < 0 THEN RAISE EXCEPTION 'FEES_NET_INVALID'; END IF;
  IF p_effective_to IS NOT NULL AND p_effective_from IS NOT NULL AND p_effective_to < p_effective_from THEN RAISE EXCEPTION 'FEES_DATES_INVALID'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id=p_student_id AND institute_id=v_institute AND status='Active')
    OR NOT EXISTS (SELECT 1 FROM public.academic_years WHERE id=p_academic_year_id AND institute_id=v_institute)
    OR NOT EXISTS (SELECT 1 FROM public.fee_heads WHERE id=p_fee_head_id AND institute_id=v_institute AND is_active IS TRUE)
  THEN RAISE EXCEPTION 'FEES_REFERENCE_INVALID'; END IF;
  IF jsonb_typeof(p_installments) <> 'array' OR jsonb_array_length(p_installments) = 0 THEN RAISE EXCEPTION 'FEES_INSTALLMENTS_REQUIRED'; END IF;
  SELECT count(*), COALESCE(sum(gross_amount),0), COALESCE(sum(discount_amount),0), COALESCE(sum(net_amount),0)
  INTO v_count,v_gross_sum,v_discount_sum,v_net_sum
  FROM jsonb_to_recordset(p_installments) AS x(installment_no integer,due_date date,gross_amount numeric,discount_amount numeric,net_amount numeric);
  IF v_gross_sum <> p_amount OR v_discount_sum <> v_discount OR v_net_sum <> v_net OR v_net_sum <> v_gross_sum-v_discount_sum THEN RAISE EXCEPTION 'FEES_INSTALLMENT_TOTAL_INVALID'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_installments) AS x(installment_no integer,due_date date,gross_amount numeric,discount_amount numeric,net_amount numeric)
    WHERE installment_no <= 0 OR due_date IS NULL OR gross_amount < 0 OR discount_amount < 0 OR net_amount < 0 OR net_amount <> gross_amount-discount_amount)
  THEN RAISE EXCEPTION 'FEES_INSTALLMENT_INVALID'; END IF;
  IF (SELECT count(DISTINCT installment_no) FROM jsonb_to_recordset(p_installments) AS x(installment_no integer)) <> v_count THEN RAISE EXCEPTION 'FEES_INSTALLMENT_DUPLICATE'; END IF;
  INSERT INTO public.student_fee_assignments(institute_id,student_id,academic_year_id,fee_head_id,amount,discount_type,discount_value,effective_from,effective_to,is_active)
  VALUES(v_institute,p_student_id,p_academic_year_id,p_fee_head_id,p_amount,p_discount_type,COALESCE(p_discount_value,0),p_effective_from,p_effective_to,true)
  RETURNING id INTO v_assignment;
  INSERT INTO public.student_fee_dues(institute_id,student_fee_assignment_id,student_id,academic_year_id,fee_head_id,installment_no,due_date,gross_amount,discount_amount,net_amount)
  SELECT v_institute,v_assignment,p_student_id,p_academic_year_id,p_fee_head_id,x.installment_no,x.due_date,x.gross_amount,x.discount_amount,x.net_amount
  FROM jsonb_to_recordset(p_installments) AS x(installment_no integer,due_date date,gross_amount numeric,discount_amount numeric,net_amount numeric);
  RETURN jsonb_build_object('assignmentId',v_assignment,'dueCount',v_count,'netAmount',v_net);
END $$;

CREATE FUNCTION public.fee_recalculate_due_status(p_due_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_outstanding numeric; v_net numeric; v_status text;
BEGIN
  SELECT net_amount,status INTO v_net,v_status FROM public.student_fee_dues WHERE id=p_due_id FOR UPDATE;
  IF v_status IN ('waived','cancelled') THEN RETURN; END IF;
  SELECT public.fee_due_outstanding(p_due_id) INTO v_outstanding;
  UPDATE public.student_fee_dues SET status=CASE WHEN v_outstanding<=0 THEN 'paid' WHEN v_outstanding<v_net THEN 'partially_paid' ELSE 'due' END,updated_at=now() WHERE id=p_due_id;
END $$;

CREATE FUNCTION public.fee_queue_confirmation(p_payment_id uuid, p_institute_id uuid, p_student_id uuid, p_initiated_by uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_settings public.fee_settings%ROWTYPE; v_payment record; v_parent record; v_student record; v_queued integer:=0; v_remaining numeric;
BEGIN
  SELECT * INTO v_settings FROM public.fee_settings WHERE institute_id=p_institute_id;
  IF NOT FOUND OR v_settings.whatsapp_payment_confirmations_enabled IS NOT TRUE THEN RETURN 'disabled'; END IF;
  SELECT p.*,pm.name mode_name,ay.name year_name,s.name student_name,i.name institute_name
  INTO v_payment FROM public.fee_payments p JOIN public.payment_modes pm ON pm.id=p.payment_mode_id
  JOIN public.academic_years ay ON ay.id=p.academic_year_id JOIN public.students s ON s.id=p.student_id
  JOIN public.institutes i ON i.id=p.institute_id WHERE p.id=p_payment_id AND p.institute_id=p_institute_id;
  SELECT COALESCE(sum(public.fee_due_outstanding(d.id)),0) INTO v_remaining FROM public.student_fee_dues d WHERE d.institute_id=p_institute_id AND d.student_id=p_student_id;
  SELECT id,name,mobile INTO v_student FROM public.students WHERE id=p_student_id AND institute_id=p_institute_id;
  SELECT pa.id,pa.name,pa.mobile INTO v_parent FROM public.parents pa JOIN public.student_parent_links spl ON spl.parent_id=pa.id AND spl.institute_id=pa.institute_id
  WHERE spl.student_id=p_student_id AND pa.institute_id=p_institute_id AND pa.is_active IS TRUE ORDER BY spl.created_at LIMIT 1;
  IF v_settings.recipient_preference IN ('parent','both') AND NULLIF(btrim(v_parent.mobile),'') IS NOT NULL THEN
    INSERT INTO public.fee_message_outbox(institute_id,student_id,parent_id,fee_payment_id,message_type,recipient_type,recipient_phone,template_name,template_parameters,idempotency_key,initiated_by)
    VALUES(p_institute_id,p_student_id,v_parent.id,p_payment_id,'payment_confirmation','parent',v_parent.mobile,v_settings.confirmation_template_name,
      jsonb_build_object('student_name',v_payment.student_name,'receipt_no',v_payment.receipt_no,'payment_date',v_payment.payment_date,'amount',v_payment.amount,'payment_mode',v_payment.mode_name,'reference_no',v_payment.reference_no,'remaining_outstanding',v_remaining,'institute_name',v_payment.institute_name),
      'payment_confirmation:'||p_payment_id||':parent:'||v_parent.id,p_initiated_by) ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_queued = ROW_COUNT;
  END IF;
  IF v_settings.recipient_preference IN ('student','both') AND NULLIF(btrim(v_student.mobile),'') IS NOT NULL THEN
    INSERT INTO public.fee_message_outbox(institute_id,student_id,fee_payment_id,message_type,recipient_type,recipient_phone,template_name,template_parameters,idempotency_key,initiated_by)
    VALUES(p_institute_id,p_student_id,p_payment_id,'payment_confirmation','student',v_student.mobile,v_settings.confirmation_template_name,
      jsonb_build_object('student_name',v_payment.student_name,'receipt_no',v_payment.receipt_no,'payment_date',v_payment.payment_date,'amount',v_payment.amount,'payment_mode',v_payment.mode_name,'reference_no',v_payment.reference_no,'remaining_outstanding',v_remaining,'institute_name',v_payment.institute_name),
      'payment_confirmation:'||p_payment_id||':student:'||p_student_id,p_initiated_by) ON CONFLICT DO NOTHING;
    v_queued := v_queued + CASE WHEN FOUND THEN 1 ELSE 0 END;
  END IF;
  IF v_queued=0 AND v_settings.recipient_preference='parent' AND NULLIF(btrim(v_student.mobile),'') IS NOT NULL THEN
    INSERT INTO public.fee_message_outbox(institute_id,student_id,fee_payment_id,message_type,recipient_type,recipient_phone,template_name,template_parameters,idempotency_key,initiated_by)
    VALUES(p_institute_id,p_student_id,p_payment_id,'payment_confirmation','student',v_student.mobile,v_settings.confirmation_template_name,
      jsonb_build_object('student_name',v_payment.student_name,'receipt_no',v_payment.receipt_no,'payment_date',v_payment.payment_date,'amount',v_payment.amount,'payment_mode',v_payment.mode_name,'reference_no',v_payment.reference_no,'remaining_outstanding',v_remaining,'institute_name',v_payment.institute_name),
      'payment_confirmation:'||p_payment_id||':student:'||p_student_id,p_initiated_by) ON CONFLICT DO NOTHING;
    v_queued := CASE WHEN FOUND THEN 1 ELSE 0 END;
  END IF;
  RETURN CASE WHEN v_queued>0 THEN 'queued' ELSE 'no_recipient' END;
END $$;

CREATE FUNCTION public.post_fee_payment(p_student_id uuid,p_academic_year_id uuid,p_payment_mode_id uuid,p_payment_date timestamptz,p_reference_no text,p_remarks text,p_allocations jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_institute uuid:=public.fee_admin_institute_id(); v_profile uuid:=(SELECT auth.uid()); v_total numeric(12,2); v_payment uuid; v_receipt text; v_sequence bigint; v_year text; v_item record; v_due record; v_outstanding numeric; v_whatsapp text;
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  IF p_payment_mode_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.payment_modes WHERE id=p_payment_mode_id AND institute_id=v_institute AND is_active IS TRUE) THEN RAISE EXCEPTION 'FEES_PAYMENT_MODE_INVALID'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.students WHERE id=p_student_id AND institute_id=v_institute) OR NOT EXISTS(SELECT 1 FROM public.academic_years WHERE id=p_academic_year_id AND institute_id=v_institute) THEN RAISE EXCEPTION 'FEES_REFERENCE_INVALID'; END IF;
  IF jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)=0 THEN RAISE EXCEPTION 'FEES_ALLOCATIONS_REQUIRED'; END IF;
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
  SELECT public.fee_queue_confirmation(v_payment,v_institute,p_student_id,v_profile) INTO v_whatsapp;
  RETURN jsonb_build_object('paymentId',v_payment,'receiptNo',v_receipt,'amount',v_total,'whatsappStatus',v_whatsapp);
END $$;

CREATE FUNCTION public.reverse_fee_payment(p_payment_id uuid,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_institute uuid:=public.fee_admin_institute_id(); v_payment record; v_due uuid;
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  IF length(btrim(COALESCE(p_reason,'')))<3 THEN RAISE EXCEPTION 'FEES_REVERSAL_REASON_REQUIRED'; END IF;
  SELECT * INTO v_payment FROM public.fee_payments WHERE id=p_payment_id AND institute_id=v_institute FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FEES_PAYMENT_NOT_FOUND'; END IF;
  IF v_payment.status='reversed' THEN RAISE EXCEPTION 'FEES_PAYMENT_ALREADY_REVERSED'; END IF;
  UPDATE public.fee_payments SET status='reversed',reversed_at=now(),reversed_by=(SELECT auth.uid()),reversal_reason=btrim(p_reason) WHERE id=p_payment_id;
  FOR v_due IN SELECT DISTINCT student_fee_due_id FROM public.fee_payment_allocations WHERE fee_payment_id=p_payment_id LOOP PERFORM public.fee_recalculate_due_status(v_due); END LOOP;
  RETURN jsonb_build_object('paymentId',p_payment_id,'receiptNo',v_payment.receipt_no,'status','reversed');
END $$;

CREATE FUNCTION public.queue_manual_fee_reminder(p_due_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_institute uuid:=public.fee_admin_institute_id(); v_due record; v_settings public.fee_settings%ROWTYPE; v_parent record; v_student record; v_outstanding numeric; v_id uuid; v_phone text; v_type text; v_parent_id uuid;
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  SELECT d.*,s.name student_name,fh.name fee_name,i.name institute_name INTO v_due FROM public.student_fee_dues d JOIN public.students s ON s.id=d.student_id JOIN public.fee_heads fh ON fh.id=d.fee_head_id JOIN public.institutes i ON i.id=d.institute_id WHERE d.id=p_due_id AND d.institute_id=v_institute;
  IF NOT FOUND THEN RAISE EXCEPTION 'FEES_DUE_NOT_FOUND'; END IF;
  SELECT public.fee_due_outstanding(p_due_id) INTO v_outstanding; IF v_outstanding<=0 OR v_due.status IN('paid','waived','cancelled') THEN RAISE EXCEPTION 'FEES_DUE_NOT_OUTSTANDING'; END IF;
  SELECT * INTO v_settings FROM public.fee_settings WHERE institute_id=v_institute;
  SELECT id,name,mobile INTO v_student FROM public.students WHERE id=v_due.student_id;
  SELECT pa.id,pa.name,pa.mobile INTO v_parent FROM public.parents pa JOIN public.student_parent_links spl ON spl.parent_id=pa.id AND spl.institute_id=pa.institute_id WHERE spl.student_id=v_due.student_id AND pa.institute_id=v_institute AND pa.is_active IS TRUE ORDER BY spl.created_at LIMIT 1;
  IF v_settings.recipient_preference IN('parent','both') AND NULLIF(btrim(v_parent.mobile),'') IS NOT NULL THEN v_phone:=v_parent.mobile;v_type:='parent';v_parent_id:=v_parent.id;
  ELSIF NULLIF(btrim(v_student.mobile),'') IS NOT NULL THEN v_phone:=v_student.mobile;v_type:='student';
  ELSE RAISE EXCEPTION 'FEES_NO_WHATSAPP_RECIPIENT'; END IF;
  INSERT INTO public.fee_message_outbox(institute_id,student_id,parent_id,student_fee_due_id,message_type,recipient_type,recipient_phone,template_name,template_parameters,idempotency_key,initiated_by)
  VALUES(v_institute,v_due.student_id,v_parent_id,p_due_id,'fee_reminder',v_type,v_phone,v_settings.reminder_template_name,
  jsonb_build_object('student_name',v_due.student_name,'fee_head',v_due.fee_name,'due_date',v_due.due_date,'net_due',v_due.net_amount,'outstanding_amount',v_outstanding,'institute_name',v_due.institute_name),
  'manual_reminder:'||p_due_id||':'||current_date||':'||v_type,(SELECT auth.uid())) ON CONFLICT(institute_id,idempotency_key) DO UPDATE SET updated_at=public.fee_message_outbox.updated_at RETURNING id INTO v_id;
  RETURN jsonb_build_object('outboxId',v_id,'status','queued','recipientType',v_type,'recipientPhone',v_phone);
END $$;

CREATE FUNCTION public.queue_overdue_fee_whatsapp_reminders(p_as_of_date date DEFAULT current_date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_institute uuid:=public.fee_admin_institute_id(); v_settings public.fee_settings%ROWTYPE; v_due record; v_outstanding numeric; v_last date; v_count integer; v_queued integer:=0;
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  SELECT * INTO v_settings FROM public.fee_settings WHERE institute_id=v_institute;
  IF NOT FOUND OR v_settings.whatsapp_fee_reminders_enabled IS NOT TRUE THEN RETURN jsonb_build_object('queuedCount',0,'status','disabled'); END IF;
  FOR v_due IN SELECT d.id FROM public.student_fee_dues d JOIN public.student_fee_assignments a ON a.id=d.student_fee_assignment_id
    WHERE d.institute_id=v_institute AND d.status IN('due','partially_paid') AND a.is_active IS TRUE
      AND d.due_date+v_settings.reminder_after_due_days<=p_as_of_date
  LOOP
    SELECT public.fee_due_outstanding(v_due.id) INTO v_outstanding; IF v_outstanding<=0 THEN CONTINUE; END IF;
    SELECT count(*),max(scheduled_for::date) INTO v_count,v_last FROM public.fee_message_outbox WHERE institute_id=v_institute AND student_fee_due_id=v_due.id AND message_type='fee_reminder' AND status<>'cancelled';
    IF v_settings.max_reminders_per_due IS NOT NULL AND v_count>=v_settings.max_reminders_per_due THEN CONTINUE; END IF;
    IF v_last IS NOT NULL AND (v_settings.repeat_every_days IS NULL OR v_last+v_settings.repeat_every_days>p_as_of_date) THEN CONTINUE; END IF;
    BEGIN PERFORM public.queue_manual_fee_reminder(v_due.id); v_queued:=v_queued+1; EXCEPTION WHEN unique_violation THEN NULL; WHEN OTHERS THEN IF SQLERRM NOT LIKE '%FEES_NO_WHATSAPP_RECIPIENT%' THEN RAISE; END IF; END;
  END LOOP;
  RETURN jsonb_build_object('queuedCount',v_queued,'status','completed','asOfDate',p_as_of_date);
END $$;

CREATE FUNCTION public.fee_dashboard_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_institute uuid:=public.fee_admin_institute_id();
BEGIN
  IF v_institute IS NULL THEN RAISE EXCEPTION 'FEES_UNAUTHORIZED'; END IF;
  RETURN jsonb_build_object(
    'totalOutstanding',(SELECT COALESCE(sum(public.fee_due_outstanding(id)),0) FROM public.student_fee_dues WHERE institute_id=v_institute AND status IN('due','partially_paid')),
    'collectionsToday',(SELECT COALESCE(sum(amount),0) FROM public.fee_payments WHERE institute_id=v_institute AND status='posted' AND payment_date::date=current_date),
    'collectionsThisMonth',(SELECT COALESCE(sum(amount),0) FROM public.fee_payments WHERE institute_id=v_institute AND status='posted' AND date_trunc('month',payment_date)=date_trunc('month',current_date)),
    'studentsOutstanding',(SELECT count(DISTINCT student_id) FROM public.student_fee_dues WHERE institute_id=v_institute AND status IN('due','partially_paid')),
    'overdueCount',(SELECT count(*) FROM public.student_fee_dues WHERE institute_id=v_institute AND status IN('due','partially_paid') AND due_date<current_date AND public.fee_due_outstanding(id)>0),
    'queuedMessages',(SELECT count(*) FROM public.fee_message_outbox WHERE institute_id=v_institute AND status='queued')
  );
END $$;

ALTER TABLE public.fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_receipt_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_message_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_modes_select ON public.payment_modes;
DROP POLICY IF EXISTS payment_modes_insert ON public.payment_modes;
DROP POLICY IF EXISTS payment_modes_update ON public.payment_modes;

CREATE POLICY fee_heads_select ON public.fee_heads FOR SELECT TO authenticated USING (institute_id=public.fee_admin_institute_id() OR institute_id IN(SELECT institute_id FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE));
CREATE POLICY fee_heads_admin_insert ON public.fee_heads FOR INSERT TO authenticated WITH CHECK (institute_id=public.fee_admin_institute_id());
CREATE POLICY fee_heads_admin_update ON public.fee_heads FOR UPDATE TO authenticated USING (institute_id=public.fee_admin_institute_id()) WITH CHECK (institute_id=public.fee_admin_institute_id());
CREATE POLICY payment_modes_select ON public.payment_modes FOR SELECT TO authenticated USING (institute_id=public.fee_admin_institute_id() OR institute_id IN(SELECT institute_id FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE));
CREATE POLICY payment_modes_admin_insert ON public.payment_modes FOR INSERT TO authenticated WITH CHECK (institute_id=public.fee_admin_institute_id());
CREATE POLICY payment_modes_admin_update ON public.payment_modes FOR UPDATE TO authenticated USING (institute_id=public.fee_admin_institute_id()) WITH CHECK (institute_id=public.fee_admin_institute_id());

CREATE POLICY fee_assignments_admin_select ON public.student_fee_assignments FOR SELECT TO authenticated USING (institute_id=public.fee_admin_institute_id());
CREATE POLICY fee_assignments_student_select ON public.student_fee_assignments FOR SELECT TO authenticated USING (student_id=public.fee_student_id(institute_id));
CREATE POLICY fee_assignments_parent_select ON public.student_fee_assignments FOR SELECT TO authenticated USING (public.fee_parent_can_view_student(institute_id,student_id));
CREATE POLICY fee_dues_admin_select ON public.student_fee_dues FOR SELECT TO authenticated USING (institute_id=public.fee_admin_institute_id());
CREATE POLICY fee_dues_student_select ON public.student_fee_dues FOR SELECT TO authenticated USING (student_id=public.fee_student_id(institute_id));
CREATE POLICY fee_dues_parent_select ON public.student_fee_dues FOR SELECT TO authenticated USING (public.fee_parent_can_view_student(institute_id,student_id));
CREATE POLICY fee_payments_admin_select ON public.fee_payments FOR SELECT TO authenticated USING (institute_id=public.fee_admin_institute_id());
CREATE POLICY fee_payments_student_select ON public.fee_payments FOR SELECT TO authenticated USING (student_id=public.fee_student_id(institute_id));
CREATE POLICY fee_payments_parent_select ON public.fee_payments FOR SELECT TO authenticated USING (public.fee_parent_can_view_student(institute_id,student_id));
CREATE POLICY fee_allocations_admin_select ON public.fee_payment_allocations FOR SELECT TO authenticated USING (institute_id=public.fee_admin_institute_id());
CREATE POLICY fee_allocations_student_select ON public.fee_payment_allocations FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.fee_payments p WHERE p.id=fee_payment_id AND p.student_id=public.fee_student_id(p.institute_id)));
CREATE POLICY fee_allocations_parent_select ON public.fee_payment_allocations FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.fee_payments p WHERE p.id=fee_payment_id AND public.fee_parent_can_view_student(p.institute_id,p.student_id)));
CREATE POLICY fee_settings_admin_all ON public.fee_settings FOR ALL TO authenticated USING (institute_id=public.fee_admin_institute_id()) WITH CHECK (institute_id=public.fee_admin_institute_id());
CREATE POLICY fee_outbox_admin_select ON public.fee_message_outbox FOR SELECT TO authenticated USING (institute_id=public.fee_admin_institute_id());

REVOKE ALL ON public.fee_heads,public.payment_modes,public.student_fee_assignments,public.student_fee_dues,public.fee_payments,public.fee_payment_allocations,public.fee_receipt_sequences,public.fee_settings,public.fee_message_outbox FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.fee_heads,public.payment_modes,public.student_fee_assignments,public.student_fee_dues,public.fee_payments,public.fee_payment_allocations TO authenticated;
GRANT INSERT,UPDATE ON public.fee_heads,public.payment_modes TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.fee_settings TO authenticated;
GRANT SELECT ON public.fee_message_outbox TO authenticated;

REVOKE ALL ON FUNCTION public.fee_admin_institute_id(),public.fee_student_id(uuid),public.fee_parent_can_view_student(uuid,uuid),public.fee_due_outstanding(uuid),public.create_student_fee_assignment(uuid,uuid,uuid,numeric,text,numeric,date,date,jsonb),public.fee_recalculate_due_status(uuid),public.fee_queue_confirmation(uuid,uuid,uuid,uuid),public.post_fee_payment(uuid,uuid,uuid,timestamptz,text,text,jsonb),public.reverse_fee_payment(uuid,text),public.queue_manual_fee_reminder(uuid),public.queue_overdue_fee_whatsapp_reminders(date),public.fee_dashboard_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fee_admin_institute_id(),public.fee_student_id(uuid),public.fee_parent_can_view_student(uuid,uuid),public.fee_due_outstanding(uuid),public.create_student_fee_assignment(uuid,uuid,uuid,numeric,text,numeric,date,date,jsonb),public.post_fee_payment(uuid,uuid,uuid,timestamptz,text,text,jsonb),public.reverse_fee_payment(uuid,text),public.queue_manual_fee_reminder(uuid),public.queue_overdue_fee_whatsapp_reminders(date),public.fee_dashboard_summary() TO authenticated;

INSERT INTO public.fee_settings(institute_id) SELECT id FROM public.institutes ON CONFLICT DO NOTHING;

COMMIT;
