BEGIN;

CREATE UNIQUE INDEX schools_institute_normalized_name_key
ON public.schools (
  institute_id,
  lower(btrim(name))
);

COMMIT;
