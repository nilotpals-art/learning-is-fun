BEGIN;

ALTER TABLE public.fee_settings
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS qr_code_url text;

ALTER TABLE public.fee_settings
  DROP CONSTRAINT IF EXISTS fee_settings_upi_id_length_check,
  DROP CONSTRAINT IF EXISTS fee_settings_bank_name_length_check,
  DROP CONSTRAINT IF EXISTS fee_settings_bank_account_name_length_check,
  DROP CONSTRAINT IF EXISTS fee_settings_bank_account_number_length_check,
  DROP CONSTRAINT IF EXISTS fee_settings_bank_ifsc_length_check,
  DROP CONSTRAINT IF EXISTS fee_settings_bank_branch_length_check,
  DROP CONSTRAINT IF EXISTS fee_settings_qr_code_url_length_check;

ALTER TABLE public.fee_settings
  ADD CONSTRAINT fee_settings_upi_id_length_check CHECK (upi_id IS NULL OR length(upi_id) <= 150),
  ADD CONSTRAINT fee_settings_bank_name_length_check CHECK (bank_name IS NULL OR length(bank_name) <= 150),
  ADD CONSTRAINT fee_settings_bank_account_name_length_check CHECK (bank_account_name IS NULL OR length(bank_account_name) <= 150),
  ADD CONSTRAINT fee_settings_bank_account_number_length_check CHECK (bank_account_number IS NULL OR length(bank_account_number) <= 80),
  ADD CONSTRAINT fee_settings_bank_ifsc_length_check CHECK (bank_ifsc IS NULL OR length(bank_ifsc) <= 30),
  ADD CONSTRAINT fee_settings_bank_branch_length_check CHECK (bank_branch IS NULL OR length(bank_branch) <= 150),
  ADD CONSTRAINT fee_settings_qr_code_url_length_check CHECK (qr_code_url IS NULL OR length(qr_code_url) <= 4000);

COMMENT ON COLUMN public.fee_settings.upi_id IS 'Institute UPI ID displayed to students and parents for fee payment.';
COMMENT ON COLUMN public.fee_settings.qr_code_url IS 'HTTPS or data-image URL for the institute payment QR code.';

COMMIT;
