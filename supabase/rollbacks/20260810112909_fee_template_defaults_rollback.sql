BEGIN;

ALTER TABLE public.fee_settings
  ALTER COLUMN reminder_template_name DROP NOT NULL,
  ALTER COLUMN reminder_template_name DROP DEFAULT,
  ALTER COLUMN confirmation_template_name DROP NOT NULL,
  ALTER COLUMN confirmation_template_name DROP DEFAULT;

COMMIT;
