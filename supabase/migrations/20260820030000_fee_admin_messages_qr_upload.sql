BEGIN;

ALTER TABLE public.fee_settings
  ADD COLUMN IF NOT EXISTS reminder_message_format text NOT NULL DEFAULT 'Dear {student_name}, your {fee_head} of {outstanding_amount} is pending from {due_date}. Please make payment at the earliest. - {institute_name}',
  ADD COLUMN IF NOT EXISTS confirmation_message_format text NOT NULL DEFAULT 'Payment received for {student_name}. Receipt {receipt_no}, Date {payment_date}, Amount {amount}, Mode {payment_mode}, Ref {reference_no}. Pending balance: {remaining_outstanding}. Thank you - {institute_name}',
  ADD COLUMN IF NOT EXISTS qr_code_path text;

ALTER TABLE public.fee_settings
  DROP CONSTRAINT IF EXISTS fee_settings_reminder_message_format_length_check,
  DROP CONSTRAINT IF EXISTS fee_settings_confirmation_message_format_length_check,
  DROP CONSTRAINT IF EXISTS fee_settings_qr_code_path_length_check;

ALTER TABLE public.fee_settings
  ADD CONSTRAINT fee_settings_reminder_message_format_length_check CHECK (length(reminder_message_format) BETWEEN 10 AND 2000),
  ADD CONSTRAINT fee_settings_confirmation_message_format_length_check CHECK (length(confirmation_message_format) BETWEEN 10 AND 2000),
  ADD CONSTRAINT fee_settings_qr_code_path_length_check CHECK (qr_code_path IS NULL OR length(qr_code_path) <= 500);

ALTER TABLE public.fee_message_outbox
  ADD COLUMN IF NOT EXISTS rendered_message text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('fee-payment-assets', 'fee-payment-assets', true, 2097152, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS fee_payment_assets_admin_select ON storage.objects;
DROP POLICY IF EXISTS fee_payment_assets_admin_insert ON storage.objects;
DROP POLICY IF EXISTS fee_payment_assets_admin_update ON storage.objects;
DROP POLICY IF EXISTS fee_payment_assets_admin_delete ON storage.objects;

CREATE POLICY fee_payment_assets_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fee-payment-assets'
    AND (storage.foldername(name))[1] = public.fee_admin_institute_id()::text
  );

CREATE POLICY fee_payment_assets_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fee-payment-assets'
    AND (storage.foldername(name))[1] = public.fee_admin_institute_id()::text
  );

CREATE POLICY fee_payment_assets_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fee-payment-assets'
    AND (storage.foldername(name))[1] = public.fee_admin_institute_id()::text
  )
  WITH CHECK (
    bucket_id = 'fee-payment-assets'
    AND (storage.foldername(name))[1] = public.fee_admin_institute_id()::text
  );

CREATE POLICY fee_payment_assets_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'fee-payment-assets'
    AND (storage.foldername(name))[1] = public.fee_admin_institute_id()::text
  );

CREATE OR REPLACE FUNCTION public.fee_render_message(p_format text, p_values jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_text text := COALESCE(p_format, '');
  v_key text;
  v_value text;
BEGIN
  FOR v_key, v_value IN SELECT key, value FROM pg_catalog.jsonb_each_text(COALESCE(p_values, '{}'::jsonb))
  LOOP
    v_text := pg_catalog.replace(v_text, '{' || v_key || '}', COALESCE(NULLIF(v_value, ''), '-'));
  END LOOP;
  RETURN v_text;
END;
$$;

CREATE OR REPLACE FUNCTION public.fee_outbox_render_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_format text;
BEGIN
  SELECT CASE NEW.message_type
    WHEN 'fee_reminder' THEN fs.reminder_message_format
    WHEN 'payment_confirmation' THEN fs.confirmation_message_format
    ELSE NULL
  END
  INTO v_format
  FROM public.fee_settings fs
  WHERE fs.institute_id = NEW.institute_id;

  IF v_format IS NOT NULL THEN
    NEW.rendered_message := public.fee_render_message(v_format, NEW.template_parameters);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fee_message_outbox_render_message ON public.fee_message_outbox;
CREATE TRIGGER fee_message_outbox_render_message
BEFORE INSERT OR UPDATE OF template_parameters, message_type, institute_id
ON public.fee_message_outbox
FOR EACH ROW EXECUTE FUNCTION public.fee_outbox_render_message();

COMMIT;
