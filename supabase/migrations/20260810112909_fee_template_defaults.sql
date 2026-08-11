BEGIN;

UPDATE public.fee_settings SET
  reminder_template_name = COALESCE(NULLIF(btrim(reminder_template_name), ''), 'fee_due_reminder'),
  confirmation_template_name = COALESCE(NULLIF(btrim(confirmation_template_name), ''), 'fee_payment_confirmation');

ALTER TABLE public.fee_settings
  ALTER COLUMN reminder_template_name SET DEFAULT 'fee_due_reminder',
  ALTER COLUMN reminder_template_name SET NOT NULL,
  ALTER COLUMN confirmation_template_name SET DEFAULT 'fee_payment_confirmation',
  ALTER COLUMN confirmation_template_name SET NOT NULL;

COMMIT;
