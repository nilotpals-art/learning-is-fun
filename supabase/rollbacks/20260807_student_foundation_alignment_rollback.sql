BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.students)
     OR EXISTS (SELECT 1 FROM public.parents)
     OR EXISTS (SELECT 1 FROM public.student_parent_links)
     OR EXISTS (SELECT 1 FROM public.student_admission_counters)
     OR EXISTS (
       SELECT 1 FROM public.profiles
       WHERE role IN ('Student', 'Parent')
          OR role_id IN (SELECT id FROM public.roles WHERE name IN ('Student', 'Parent'))
     ) THEN
    RAISE EXCEPTION 'Rollback refused because Student foundation data or profiles now exist.';
  END IF;
END;
$$;

ALTER TABLE public.student_batches
  DROP CONSTRAINT IF EXISTS student_batches_student_id_fkey;

DELETE FROM public.roles
WHERE name IN ('Student', 'Parent')
  AND institute_id IS NULL;

DROP TABLE public.student_parent_links;
DROP TABLE public.parents;

DROP INDEX public.students_email_normalized_key;

ALTER TABLE public.students
  DROP CONSTRAINT students_id_institute_id_key,
  DROP CONSTRAINT students_profile_id_key,
  DROP CONSTRAINT students_profile_id_fkey,
  DROP CONSTRAINT students_email_normalized_check,
  DROP CONSTRAINT students_status_check,
  ADD COLUMN first_name text NOT NULL,
  ADD COLUMN middle_name text,
  ADD COLUMN last_name text NOT NULL,
  ADD COLUMN roll_no text,
  ADD COLUMN blood_group text,
  ADD COLUMN whatsapp_no text,
  ADD COLUMN aadhaar_no text,
  ADD COLUMN photo_url text,
  ADD COLUMN admission_status text NOT NULL DEFAULT 'Active',
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN gender DROP NOT NULL,
  ALTER COLUMN mobile DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  DROP COLUMN profile_id,
  DROP COLUMN status,
  DROP COLUMN admission_date,
  DROP COLUMN address,
  DROP COLUMN name;

ALTER TABLE public.students RENAME COLUMN comments TO remarks;

DROP FUNCTION public.next_student_admission_no(uuid, uuid);
DROP TABLE public.student_admission_counters;

CREATE FUNCTION public.generate_admission_no()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  current_year text;
  next_number integer;
BEGIN
  current_year := extract(year FROM current_date)::text;

  SELECT count(*) + 1
  INTO next_number
  FROM public.students
  WHERE admission_no LIKE 'LIF-' || current_year || '-%';

  RETURN 'LIF-' || current_year || '-' || lpad(next_number::text, 5, '0');
END;
$$;

UPDATE public.institutes
SET short_name = NULL,
    updated_at = now()
WHERE id = '0dc9fd67-b180-4396-a5d0-a505e26d2f07'
  AND short_name = 'LIF';

COMMIT;
