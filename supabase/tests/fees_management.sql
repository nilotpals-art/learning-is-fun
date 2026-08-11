BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='student_fee_assignments' AND column_name='institute_id' AND is_nullable='NO') THEN RAISE EXCEPTION 'student_fee_assignments institute hardening missing'; END IF;
  IF (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('student_fee_dues','fee_payments','fee_payment_allocations','fee_receipt_sequences','fee_settings','fee_message_outbox')) <> 6 THEN RAISE EXCEPTION 'Fees tables missing'; END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('student_fee_dues','fee_payments','fee_payment_allocations','fee_receipt_sequences','fee_settings','fee_message_outbox') AND c.relrowsecurity IS FALSE) THEN RAISE EXCEPTION 'Fees RLS missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='post_fee_payment' AND p.prosecdef) THEN RAISE EXCEPTION 'Atomic payment RPC missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='queue_overdue_fee_whatsapp_reminders' AND p.prosecdef) THEN RAISE EXCEPTION 'Reminder RPC missing'; END IF;
  IF has_table_privilege('anon','public.fee_payments','SELECT') THEN RAISE EXCEPTION 'Anonymous payment access must be denied'; END IF;
  IF has_table_privilege('authenticated','public.fee_payments','INSERT') THEN RAISE EXCEPTION 'Direct payment insertion must be denied'; END IF;
  IF has_table_privilege('authenticated','public.fee_payment_allocations','UPDATE') THEN RAISE EXCEPTION 'Direct allocation updates must be denied'; END IF;
  IF EXISTS (SELECT 1 FROM public.fee_settings WHERE reminder_template_name IS NULL OR confirmation_template_name IS NULL) THEN RAISE EXCEPTION 'WhatsApp template defaults missing'; END IF;
END $$;

ROLLBACK;
