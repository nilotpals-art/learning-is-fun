BEGIN;
DROP FUNCTION IF EXISTS public.apply_class_fee_structure(uuid,uuid,jsonb);
DROP FUNCTION IF EXISTS public.save_class_fee_structure(uuid,uuid,uuid,text,boolean,jsonb);
ALTER TABLE public.student_fee_assignments DROP CONSTRAINT IF EXISTS student_fee_assignments_structure_item_fkey,DROP CONSTRAINT IF EXISTS student_fee_assignments_nature_check,DROP COLUMN IF EXISTS class_fee_structure_item_id,DROP COLUMN IF EXISTS fee_nature_snapshot;
DROP TABLE IF EXISTS public.class_fee_structure_installments;
DROP TABLE IF EXISTS public.class_fee_structure_items;
DROP TABLE IF EXISTS public.class_fee_structures;
ALTER TABLE public.fee_heads DROP CONSTRAINT IF EXISTS fee_heads_fee_nature_check,DROP COLUMN IF EXISTS fee_nature;
COMMIT;
