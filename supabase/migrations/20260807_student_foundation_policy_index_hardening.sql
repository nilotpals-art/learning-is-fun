BEGIN;

ALTER POLICY parents_admin_select
ON public.parents
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = parents.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

ALTER POLICY parents_admin_insert
ON public.parents
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = parents.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

ALTER POLICY parents_admin_update
ON public.parents
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = parents.institute_id
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
      AND p.institute_id = parents.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

ALTER POLICY student_parent_links_admin_select
ON public.student_parent_links
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = student_parent_links.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

ALTER POLICY student_parent_links_admin_insert
ON public.student_parent_links
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = student_parent_links.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

ALTER POLICY student_parent_links_admin_update
ON public.student_parent_links
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND p.institute_id = student_parent_links.institute_id
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
      AND p.institute_id = student_parent_links.institute_id
      AND p.is_active IS TRUE
      AND COALESCE(NULLIF(btrim(p.role), ''), r.name)
        IN ('admin', 'Super Admin', 'Institute Admin')
  )
);

DROP INDEX public.student_parent_links_parent_id_idx;

CREATE INDEX student_parent_links_student_institute_idx
  ON public.student_parent_links(student_id, institute_id);

CREATE INDEX student_parent_links_parent_institute_idx
  ON public.student_parent_links(parent_id, institute_id);

CREATE INDEX student_parent_links_institute_id_idx
  ON public.student_parent_links(institute_id);

COMMIT;
