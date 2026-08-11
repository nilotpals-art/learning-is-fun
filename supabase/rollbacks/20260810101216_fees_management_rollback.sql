BEGIN;

DROP FUNCTION IF EXISTS public.fee_dashboard_summary();
DROP FUNCTION IF EXISTS public.queue_overdue_fee_whatsapp_reminders(date);
DROP FUNCTION IF EXISTS public.queue_manual_fee_reminder(uuid);
DROP FUNCTION IF EXISTS public.reverse_fee_payment(uuid,text);
DROP FUNCTION IF EXISTS public.post_fee_payment(uuid,uuid,uuid,timestamptz,text,text,jsonb);
DROP FUNCTION IF EXISTS public.fee_queue_confirmation(uuid,uuid,uuid,uuid);
DROP FUNCTION IF EXISTS public.fee_recalculate_due_status(uuid);
DROP FUNCTION IF EXISTS public.create_student_fee_assignment(uuid,uuid,uuid,numeric,text,numeric,date,date,jsonb);
DROP FUNCTION IF EXISTS public.fee_due_outstanding(uuid);
DROP FUNCTION IF EXISTS public.fee_parent_can_view_student(uuid,uuid);
DROP FUNCTION IF EXISTS public.fee_student_id(uuid);
DROP FUNCTION IF EXISTS public.fee_admin_institute_id();

DROP TABLE IF EXISTS public.fee_message_outbox;
DROP TABLE IF EXISTS public.fee_settings;
DROP TABLE IF EXISTS public.fee_payment_allocations;
DROP TABLE IF EXISTS public.fee_payments;
DROP TABLE IF EXISTS public.fee_receipt_sequences;
DROP TABLE IF EXISTS public.student_fee_dues;

DROP POLICY IF EXISTS fee_assignments_admin_select ON public.student_fee_assignments;
DROP POLICY IF EXISTS fee_assignments_student_select ON public.student_fee_assignments;
DROP POLICY IF EXISTS fee_assignments_parent_select ON public.student_fee_assignments;
DROP POLICY IF EXISTS fee_heads_select ON public.fee_heads;
DROP POLICY IF EXISTS fee_heads_admin_insert ON public.fee_heads;
DROP POLICY IF EXISTS fee_heads_admin_update ON public.fee_heads;
DROP POLICY IF EXISTS payment_modes_select ON public.payment_modes;
DROP POLICY IF EXISTS payment_modes_admin_insert ON public.payment_modes;
DROP POLICY IF EXISTS payment_modes_admin_update ON public.payment_modes;

ALTER TABLE public.fee_heads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_assignments
  DROP CONSTRAINT IF EXISTS student_fee_assignments_institute_fkey,
  DROP CONSTRAINT IF EXISTS student_fee_assignments_id_institute_key,
  DROP CONSTRAINT IF EXISTS student_fee_assignments_amount_check,
  DROP CONSTRAINT IF EXISTS student_fee_assignments_discount_type_check,
  DROP CONSTRAINT IF EXISTS student_fee_assignments_discount_value_check,
  DROP CONSTRAINT IF EXISTS student_fee_assignments_dates_check,
  DROP COLUMN IF EXISTS institute_id,
  ALTER COLUMN discount_type SET DEFAULT 'Amount';
DROP INDEX IF EXISTS public.student_fee_assignments_active_fee_key;
DROP INDEX IF EXISTS public.student_fee_assignments_scope_idx;
ALTER TABLE public.fee_heads DROP CONSTRAINT IF EXISTS fee_heads_id_institute_key;
ALTER TABLE public.payment_modes DROP CONSTRAINT IF EXISTS payment_modes_id_institute_key;

GRANT ALL ON public.fee_heads, public.student_fee_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_modes TO authenticated;

COMMIT;
