
-- Lock down "protected settings" tables to admin/owner writes only.
-- Today these tables have BOTH an admin ALL policy AND member-level
-- INSERT/UPDATE/DELETE policies. Postgres OR-merges policies per command,
-- so the permissive member policies make the admin gate useless.
-- Drop the member-level write policies and keep only:
--   * SELECT  for any tenant member
--   * INSERT/UPDATE/DELETE for tenant admin/owner

-- objections
DROP POLICY IF EXISTS "objections tenant insert" ON public.objections;
DROP POLICY IF EXISTS "objections tenant update" ON public.objections;
DROP POLICY IF EXISTS "objections tenant delete" ON public.objections;

-- next_action_presets
DROP POLICY IF EXISTS "tenant_insert" ON public.next_action_presets;
DROP POLICY IF EXISTS "tenant_update" ON public.next_action_presets;
DROP POLICY IF EXISTS "tenant_delete" ON public.next_action_presets;

-- script_sections
DROP POLICY IF EXISTS "tenant_insert" ON public.script_sections;
DROP POLICY IF EXISTS "tenant_update" ON public.script_sections;
DROP POLICY IF EXISTS "tenant_delete" ON public.script_sections;

-- email_templates
DROP POLICY IF EXISTS "tenant_insert" ON public.email_templates;
DROP POLICY IF EXISTS "tenant_update" ON public.email_templates;
DROP POLICY IF EXISTS "tenant_delete" ON public.email_templates;

-- training_documents
DROP POLICY IF EXISTS "training_documents tenant insert" ON public.training_documents;
DROP POLICY IF EXISTS "training_documents tenant update" ON public.training_documents;
DROP POLICY IF EXISTS "training_documents tenant delete" ON public.training_documents;

-- offers
DROP POLICY IF EXISTS "tenant_insert" ON public.offers;
DROP POLICY IF EXISTS "tenant_update" ON public.offers;
DROP POLICY IF EXISTS "tenant_delete" ON public.offers;

-- offer_pdfs had no admin policy at all — add one, then drop member writes.
CREATE POLICY "admins write offer_pdfs"
  ON public.offer_pdfs
  FOR ALL
  USING (public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));
DROP POLICY IF EXISTS "tenant_insert" ON public.offer_pdfs;
DROP POLICY IF EXISTS "tenant_update" ON public.offer_pdfs;
DROP POLICY IF EXISTS "tenant_delete" ON public.offer_pdfs;

-- Normalize invite emails on insert/update so casing/whitespace cannot
-- bypass the "different email address" check in accept_tenant_invite.
CREATE OR REPLACE FUNCTION public.tenant_invites_normalize_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(btrim(NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenant_invites_normalize_email ON public.tenant_invites;
CREATE TRIGGER tenant_invites_normalize_email
  BEFORE INSERT OR UPDATE ON public.tenant_invites
  FOR EACH ROW EXECUTE FUNCTION public.tenant_invites_normalize_email();

-- Re-affirm delete_workspace is owner-only (current definition already is,
-- but make the rejection explicit + clearer message).
CREATE OR REPLACE FUNCTION public.delete_workspace(p_tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF v_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can delete this workspace (your role: %)', COALESCE(v_role::text, 'none');
  END IF;

  UPDATE public.profiles SET active_tenant_id = NULL WHERE active_tenant_id = p_tenant_id;

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
$function$;

-- Gate apply_template to admin/owner only (it writes to all the locked-down tables).
CREATE OR REPLACE FUNCTION public.apply_template(p_tenant_id uuid, p_template_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payload JSONB;
  v_user UUID := auth.uid();
  v_offers INT := 0; v_emails INT := 0; v_scripts INT := 0;
  v_objections INT := 0; v_presets INT := 0; v_steps INT := 0; v_decisions INT := 0;
  v_step_id uuid;
  v_settings_patch jsonb;
  s jsonb; d jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_tenant_admin(p_tenant_id, v_user) THEN
    RAISE EXCEPTION 'Only workspace admins or owners can apply templates';
  END IF;

  SELECT content INTO v_payload FROM public.template_payloads WHERE template_id = p_template_id;
  IF v_payload IS NULL THEN RAISE EXCEPTION 'Template payload not found'; END IF;

  INSERT INTO public.offers (tenant_id, user_id, slug, name, type, cost, when_to_introduce, details, sort_order)
  SELECT p_tenant_id, v_user, x->>'slug', x->>'name', x->>'type', x->>'cost', x->>'when_to_introduce', x->>'details',
         COALESCE((x->>'sort_order')::int, 0)
  FROM jsonb_array_elements(COALESCE(v_payload->'offers','[]'::jsonb)) AS x
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_offers = ROW_COUNT;

  INSERT INTO public.email_templates (tenant_id, user_id, slug, name, subject, body)
  SELECT p_tenant_id, v_user, x->>'slug', x->>'name', x->>'subject', x->>'body'
  FROM jsonb_array_elements(COALESCE(v_payload->'email_templates','[]'::jsonb)) AS x
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_emails = ROW_COUNT;

  INSERT INTO public.script_sections (tenant_id, user_id, slug, title, body, sort_order)
  SELECT p_tenant_id, v_user, x->>'slug', x->>'title', x->>'body', COALESCE((x->>'sort_order')::int, 0)
  FROM jsonb_array_elements(COALESCE(v_payload->'script_sections','[]'::jsonb)) AS x
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_scripts = ROW_COUNT;

  INSERT INTO public.objections (tenant_id, user_id, slug, trigger, response, tip, sort_order)
  SELECT p_tenant_id, v_user, x->>'slug', x->>'trigger', x->>'response', x->>'tip',
         COALESCE((x->>'sort_order')::int, 0)
  FROM jsonb_array_elements(COALESCE(v_payload->'objections','[]'::jsonb)) AS x
  ON CONFLICT (tenant_id, slug) DO NOTHING;
  GET DIAGNOSTICS v_objections = ROW_COUNT;

  INSERT INTO public.next_action_presets (tenant_id, user_id, slug, label, offset_days, sort_order)
  SELECT p_tenant_id, v_user, x->>'slug', x->>'label',
         COALESCE((x->>'offset_days')::int, 0), COALESCE((x->>'sort_order')::int, 0)
  FROM jsonb_array_elements(COALESCE(v_payload->'next_action_presets','[]'::jsonb)) AS x
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_presets = ROW_COUNT;

  FOR s IN SELECT value FROM jsonb_array_elements(COALESCE(v_payload->'pipeline_steps','[]'::jsonb))
  LOOP
    INSERT INTO public.pipeline_steps
      (tenant_id, slug, step_number, emoji, title, subtitle, callout_tone, callout_text,
       script_lines, checklist, capture_keys, sort_order)
    VALUES
      (p_tenant_id, s->>'slug', s->>'step_number', s->>'emoji', s->>'title', s->>'subtitle',
       s->'callout'->>'tone', s->'callout'->>'text',
       COALESCE(s->'script_lines','[]'::jsonb),
       COALESCE(s->'checklist','[]'::jsonb),
       COALESCE(s->'capture_keys','[]'::jsonb),
       COALESCE((s->>'sort_order')::int, 0))
    ON CONFLICT (tenant_id, slug) DO NOTHING
    RETURNING id INTO v_step_id;

    IF v_step_id IS NOT NULL THEN
      v_steps := v_steps + 1;
      FOR d IN SELECT value FROM jsonb_array_elements(COALESCE(s->'decisions','[]'::jsonb))
      LOOP
        INSERT INTO public.pipeline_decisions
          (tenant_id, step_id, label, goto_slug, variant, patch, sort_order)
        VALUES
          (p_tenant_id, v_step_id, d->>'label', d->>'goto',
           NULLIF(d->>'variant',''), COALESCE(d->'patch','{}'::jsonb),
           COALESCE((d->>'sort_order')::int, 0));
        v_decisions := v_decisions + 1;
      END LOOP;
    END IF;
  END LOOP;

  v_settings_patch := COALESCE(v_payload->'tenant_settings', '{}'::jsonb);
  IF jsonb_typeof(v_settings_patch) = 'object' AND v_settings_patch <> '{}'::jsonb THEN
    UPDATE public.tenants
       SET settings = COALESCE(settings, '{}'::jsonb) || v_settings_patch,
           updated_at = now()
     WHERE id = p_tenant_id;
  END IF;

  RETURN jsonb_build_object(
    'offers', v_offers, 'email_templates', v_emails,
    'script_sections', v_scripts, 'objections', v_objections,
    'next_action_presets', v_presets,
    'pipeline_steps', v_steps, 'pipeline_decisions', v_decisions,
    'tenant_settings_applied', v_settings_patch
  );
END;
$function$;
