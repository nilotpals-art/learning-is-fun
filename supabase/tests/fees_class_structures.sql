BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='fee_heads' AND column_name='fee_nature') THEN RAISE EXCEPTION 'fee_nature missing'; END IF;
 IF (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN('class_fee_structures','class_fee_structure_items','class_fee_structure_installments'))<>3 THEN RAISE EXCEPTION 'structure tables missing'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN('class_fee_structures','class_fee_structure_items','class_fee_structure_installments') AND c.relrowsecurity IS FALSE) THEN RAISE EXCEPTION 'structure RLS missing'; END IF;
 IF has_table_privilege('anon','public.class_fee_structures','SELECT') THEN RAISE EXCEPTION 'anonymous structure access allowed'; END IF;
 IF has_table_privilege('authenticated','public.class_fee_structures','INSERT') THEN RAISE EXCEPTION 'direct structure mutation allowed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='class_fee_structures_active_key') THEN RAISE EXCEPTION 'active uniqueness missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.fee_heads WHERE (lower(category)='security deposit' OR lower(name)='security deposit') AND fee_nature='refundable_deposit') THEN RAISE EXCEPTION 'Security Deposit classification missing'; END IF;
END $$;
ROLLBACK;
