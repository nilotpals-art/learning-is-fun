BEGIN;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.students FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.students TO authenticated;

CREATE POLICY students_admin_select
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = students.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

CREATE POLICY students_admin_insert
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = students.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

CREATE POLICY students_admin_update
ON public.students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = students.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = students.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

COMMIT;
