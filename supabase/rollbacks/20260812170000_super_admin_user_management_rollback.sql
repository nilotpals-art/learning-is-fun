BEGIN;
DROP FUNCTION IF EXISTS public.update_managed_administrator(uuid,text,text,uuid,boolean);
DROP FUNCTION IF EXISTS public.finalize_administrator_identity(uuid,text,text,text,uuid,boolean);
DROP FUNCTION IF EXISTS public.user_management_super_admin_scope(uuid);
UPDATE public.profiles SET role='admin',role_id=NULL,updated_at=now() WHERE id='ea7cda27-2358-4fdd-a1ef-1dd3638ed29f' AND role='Super Admin';
COMMIT;
