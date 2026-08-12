BEGIN;

INSERT INTO public.roles(id,name)
SELECT gen_random_uuid(),'Super Admin'
WHERE NOT EXISTS(SELECT 1 FROM public.roles WHERE name='Super Admin');

DO $$
DECLARE v_profile public.profiles%ROWTYPE; v_role_id uuid;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id='ea7cda27-2358-4fdd-a1ef-1dd3638ed29f'::uuid FOR UPDATE;
  IF v_profile.id IS NULL OR v_profile.is_active IS NOT TRUE OR v_profile.role<>'admin' OR v_profile.institute_id<>'0dc9fd67-b180-4396-a5d0-a505e26d2f07'::uuid THEN RAISE EXCEPTION 'SUPER_ADMIN_BOOTSTRAP_PROFILE_INVALID'; END IF;
  SELECT id INTO v_role_id FROM public.roles WHERE name='Super Admin';
  UPDATE public.profiles SET role='Super Admin',role_id=v_role_id,updated_at=now() WHERE id=v_profile.id;
END $$;

CREATE FUNCTION public.user_management_super_admin_scope(p_institute_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
SELECT EXISTS(SELECT 1 FROM public.profiles p LEFT JOIN public.roles r ON r.id=p.role_id WHERE p.id=(SELECT auth.uid()) AND p.is_active IS TRUE AND p.institute_id=p_institute_id AND COALESCE(NULLIF(btrim(p.role),''),r.name)='Super Admin');
$$;

CREATE FUNCTION public.finalize_administrator_identity(p_auth_user_id uuid,p_email text,p_name text,p_mobile text,p_branch_id uuid,p_is_active boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor public.profiles%ROWTYPE; v_email text:=lower(btrim(p_email));
BEGIN
 SELECT * INTO v_actor FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE;
 IF v_actor.id IS NULL OR NOT public.user_management_super_admin_scope(v_actor.institute_id) THEN RAISE EXCEPTION 'USER_MANAGEMENT_UNAUTHORIZED'; END IF;
 IF p_auth_user_id IS NULL OR v_email='' OR btrim(p_name)='' OR btrim(p_mobile)='' THEN RAISE EXCEPTION 'USER_MANAGEMENT_INVALID'; END IF;
 IF p_branch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.branches b WHERE b.id=p_branch_id AND b.institute_id=v_actor.institute_id) THEN RAISE EXCEPTION 'USER_MANAGEMENT_BRANCH_INVALID'; END IF;
 IF EXISTS(SELECT 1 FROM public.profiles p WHERE lower(btrim(p.email))=v_email OR p.id=p_auth_user_id OR p.user_id=p_auth_user_id) THEN RAISE EXCEPTION 'USER_MANAGEMENT_EMAIL_CONFLICT'; END IF;
 INSERT INTO public.profiles(id,user_id,institute_id,branch_id,name,mobile,email,role,role_id,is_active)
 VALUES(p_auth_user_id,p_auth_user_id,v_actor.institute_id,p_branch_id,upper(btrim(p_name)),btrim(p_mobile),v_email,'admin',NULL,COALESCE(p_is_active,true));
 RETURN p_auth_user_id;
END $$;

CREATE FUNCTION public.update_managed_administrator(p_profile_id uuid,p_name text,p_mobile text,p_branch_id uuid,p_is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor public.profiles%ROWTYPE; v_target public.profiles%ROWTYPE;
BEGIN
 SELECT * INTO v_actor FROM public.profiles WHERE id=(SELECT auth.uid()) AND is_active IS TRUE;
 IF v_actor.id IS NULL OR NOT public.user_management_super_admin_scope(v_actor.institute_id) THEN RAISE EXCEPTION 'USER_MANAGEMENT_UNAUTHORIZED'; END IF;
 SELECT * INTO v_target FROM public.profiles WHERE id=p_profile_id AND institute_id=v_actor.institute_id FOR UPDATE;
 IF v_target.id IS NULL OR v_target.role<>'admin' THEN RAISE EXCEPTION 'USER_MANAGEMENT_NOT_FOUND'; END IF;
 IF p_profile_id=v_actor.id AND p_is_active IS NOT TRUE THEN RAISE EXCEPTION 'USER_MANAGEMENT_SELF_DEACTIVATION'; END IF;
 IF p_branch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.branches b WHERE b.id=p_branch_id AND b.institute_id=v_actor.institute_id) THEN RAISE EXCEPTION 'USER_MANAGEMENT_BRANCH_INVALID'; END IF;
 UPDATE public.profiles SET name=upper(btrim(p_name)),mobile=btrim(p_mobile),branch_id=p_branch_id,is_active=p_is_active,updated_at=now() WHERE id=p_profile_id;
END $$;

REVOKE ALL ON FUNCTION public.user_management_super_admin_scope(uuid),public.finalize_administrator_identity(uuid,text,text,text,uuid,boolean),public.update_managed_administrator(uuid,text,text,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.user_management_super_admin_scope(uuid),public.finalize_administrator_identity(uuid,text,text,text,uuid,boolean),public.update_managed_administrator(uuid,text,text,uuid,boolean) TO authenticated;
COMMIT;
