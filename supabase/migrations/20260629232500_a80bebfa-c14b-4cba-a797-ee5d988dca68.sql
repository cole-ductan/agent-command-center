CREATE OR REPLACE FUNCTION public.accept_tenant_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_invite record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  SELECT * INTO v_invite
  FROM public.tenant_invites
  WHERE token = p_token
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  IF lower(v_invite.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'Invite was sent to a different email address';
  END IF;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_invite.tenant_id, v_user, v_invite.role)
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.tenant_invites
     SET accepted_at = now()
   WHERE id = v_invite.id;

  UPDATE public.profiles
     SET active_tenant_id = v_invite.tenant_id
   WHERE id = v_user;

  RETURN jsonb_build_object('tenant_id', v_invite.tenant_id, 'role', v_invite.role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_tenant_invite(text) TO authenticated;

NOTIFY pgrst, 'reload schema';