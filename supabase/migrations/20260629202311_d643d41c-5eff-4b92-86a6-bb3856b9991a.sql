CREATE OR REPLACE FUNCTION public.delete_workspace(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_role tenant_role;
  v_name text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT name INTO v_name FROM public.tenants WHERE id = p_tenant_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  v_role := public.tenant_role_of(p_tenant_id, v_user);
  IF v_role IS NULL OR v_role <> 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can delete this workspace';
  END IF;

  -- Clear active_tenant_id for any profile pointing at this workspace
  UPDATE public.profiles SET active_tenant_id = NULL WHERE active_tenant_id = p_tenant_id;

  -- Delete tenant-owned child rows. Order matters where FKs exist.
  DELETE FROM public.point_logs           WHERE tenant_id = p_tenant_id;
  DELETE FROM public.weekly_goals         WHERE tenant_id = p_tenant_id;
  DELETE FROM public.cm_schedules         WHERE tenant_id = p_tenant_id;
  DELETE FROM public.calls                WHERE tenant_id = p_tenant_id;
  DELETE FROM public.emails               WHERE tenant_id = p_tenant_id;
  DELETE FROM public.tasks                WHERE tenant_id = p_tenant_id;
  DELETE FROM public.notes                WHERE tenant_id = p_tenant_id;
  DELETE FROM public.note_folders         WHERE tenant_id = p_tenant_id;
  DELETE FROM public.events               WHERE tenant_id = p_tenant_id;
  DELETE FROM public.contacts             WHERE tenant_id = p_tenant_id;
  DELETE FROM public.organizations        WHERE tenant_id = p_tenant_id;
  DELETE FROM public.offer_pdfs           WHERE tenant_id = p_tenant_id;
  DELETE FROM public.offers               WHERE tenant_id = p_tenant_id;
  DELETE FROM public.email_templates      WHERE tenant_id = p_tenant_id;
  DELETE FROM public.script_sections      WHERE tenant_id = p_tenant_id;
  DELETE FROM public.objections           WHERE tenant_id = p_tenant_id;
  DELETE FROM public.next_action_presets  WHERE tenant_id = p_tenant_id;
  DELETE FROM public.pipeline_decisions   WHERE tenant_id = p_tenant_id;
  DELETE FROM public.pipeline_steps       WHERE tenant_id = p_tenant_id;
  DELETE FROM public.training_documents   WHERE tenant_id = p_tenant_id;
  DELETE FROM public.google_tokens        WHERE tenant_id = p_tenant_id;
  DELETE FROM public.tenant_invites       WHERE tenant_id = p_tenant_id;
  DELETE FROM public.tenant_members       WHERE tenant_id = p_tenant_id;
  DELETE FROM public.tenants              WHERE id        = p_tenant_id;

  RETURN jsonb_build_object('deleted', true, 'name', v_name);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_workspace(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workspace(uuid) TO service_role;