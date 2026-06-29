
-- =========================================================
-- 1. ROLE HELPER
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_tenant_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id
      AND user_id  = _user_id
      AND role IN ('owner','admin')
  );
$$;

-- =========================================================
-- 2. INVITE ACCEPTANCE
-- =========================================================
CREATE OR REPLACE FUNCTION public.accept_tenant_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_email  text;
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
     SET accepted_at = now(), accepted_by = v_user
   WHERE id = v_invite.id;

  UPDATE public.profiles
     SET active_tenant_id = v_invite.tenant_id
   WHERE id = v_user;

  RETURN jsonb_build_object('tenant_id', v_invite.tenant_id, 'role', v_invite.role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_tenant_invite(text) TO authenticated;

-- =========================================================
-- 3. GOOGLE TOKENS — TENANT SCOPING
-- =========================================================
ALTER TABLE public.google_tokens
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill from profile.active_tenant_id
UPDATE public.google_tokens g
   SET tenant_id = p.active_tenant_id
  FROM public.profiles p
 WHERE g.tenant_id IS NULL
   AND p.id = g.user_id
   AND p.active_tenant_id IS NOT NULL;

-- Drop unbackfilled rows (orphaned)
DELETE FROM public.google_tokens WHERE tenant_id IS NULL;

ALTER TABLE public.google_tokens
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS google_tokens_tenant_idx ON public.google_tokens(tenant_id);

-- Replace per-user RLS with tenant-scoped
DROP POLICY IF EXISTS "Users can view own google tokens"   ON public.google_tokens;
DROP POLICY IF EXISTS "Users can insert own google tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users can update own google tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Users can delete own google tokens" ON public.google_tokens;
DROP POLICY IF EXISTS "Members can view tenant google tokens"  ON public.google_tokens;
DROP POLICY IF EXISTS "Owner user can insert google tokens"    ON public.google_tokens;
DROP POLICY IF EXISTS "Owner user can update google tokens"    ON public.google_tokens;
DROP POLICY IF EXISTS "Owner user can delete google tokens"    ON public.google_tokens;

CREATE POLICY "Members can view tenant google tokens"
  ON public.google_tokens FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "Owner user can insert google tokens"
  ON public.google_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "Owner user can update google tokens"
  ON public.google_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_tenant_member(tenant_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id AND public.is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "Owner user can delete google tokens"
  ON public.google_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_tenant_member(tenant_id, auth.uid()));

-- =========================================================
-- 4. STORAGE — TENANT-SCOPED RLS
--    Path convention: {tenant_id}/...
-- =========================================================

-- offer-pdfs: lock down (previously public-ish via per-user policies)
DROP POLICY IF EXISTS "offer-pdfs read"   ON storage.objects;
DROP POLICY IF EXISTS "offer-pdfs insert" ON storage.objects;
DROP POLICY IF EXISTS "offer-pdfs update" ON storage.objects;
DROP POLICY IF EXISTS "offer-pdfs delete" ON storage.objects;
DROP POLICY IF EXISTS "Public can read offer pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage own offer pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read offer pdfs" ON storage.objects;

CREATE POLICY "tenant members read offer-pdfs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'offer-pdfs'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins write offer-pdfs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'offer-pdfs'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins update offer-pdfs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'offer-pdfs'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins delete offer-pdfs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'offer-pdfs'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- training-docs (members read, admins write)
CREATE POLICY "tenant members read training-docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'training-docs'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins write training-docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'training-docs'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins update training-docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'training-docs'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins delete training-docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'training-docs'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- org-branding (members read, admins write)
CREATE POLICY "tenant members read org-branding"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND public.is_tenant_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins write org-branding"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org-branding'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins update org-branding"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins delete org-branding"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-branding'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- =========================================================
-- 5. ROLE-GATED MUTATIONS ON SETTINGS-Y TABLES
--    (admins/owners only; members keep read)
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['offers','email_templates','script_sections','objections','next_action_presets','training_documents']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "members write %1$I" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "admins write %1$I"  ON public.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY "admins write %1$I" ON public.%1$I
      FOR ALL TO authenticated
      USING (public.is_tenant_admin(tenant_id, auth.uid()))
      WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()))
    $f$, t);
  END LOOP;
END $$;

-- =========================================================
-- 6. EDITABLE LIVE-CALL PIPELINE TABLES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pipeline_steps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  step_number  text NOT NULL,           -- "PRE" or "1".. (stringy to allow PRE)
  emoji        text,
  title        text NOT NULL,
  subtitle     text,
  callout_tone text CHECK (callout_tone IN ('info','warn','critical')),
  callout_text text,
  script_lines jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist    jsonb NOT NULL DEFAULT '[]'::jsonb,
  capture_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_steps TO authenticated;
GRANT ALL ON public.pipeline_steps TO service_role;
ALTER TABLE public.pipeline_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read pipeline_steps" ON public.pipeline_steps
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "admins write pipeline_steps" ON public.pipeline_steps
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE TRIGGER pipeline_steps_updated_at
  BEFORE UPDATE ON public.pipeline_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.pipeline_decisions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  step_id      uuid NOT NULL REFERENCES public.pipeline_steps(id) ON DELETE CASCADE,
  label        text NOT NULL,
  goto_slug    text NOT NULL,             -- target step slug or 'wrap'
  variant      text CHECK (variant IN ('primary','default','muted')),
  patch        jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_decisions TO authenticated;
GRANT ALL ON public.pipeline_decisions TO service_role;
ALTER TABLE public.pipeline_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read pipeline_decisions" ON public.pipeline_decisions
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

CREATE POLICY "admins write pipeline_decisions" ON public.pipeline_decisions
  FOR ALL TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()))
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));

CREATE TRIGGER pipeline_decisions_updated_at
  BEFORE UPDATE ON public.pipeline_decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 7. EXTEND apply_template TO HANDLE PIPELINE
-- =========================================================
CREATE OR REPLACE FUNCTION public.apply_template(p_tenant_id uuid, p_template_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB;
  v_user UUID := auth.uid();
  v_offers INT := 0; v_emails INT := 0; v_scripts INT := 0;
  v_objections INT := 0; v_presets INT := 0; v_steps INT := 0; v_decisions INT := 0;
  v_step_id uuid;
  s jsonb; d jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.is_tenant_member(p_tenant_id, v_user) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  SELECT content INTO v_payload FROM public.template_payloads WHERE template_id = p_template_id;
  IF v_payload IS NULL THEN RAISE EXCEPTION 'Template payload not found'; END IF;

  -- Offers / Emails / Scripts / Objections / Presets (unchanged behavior)
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

  -- Pipeline steps + decisions
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

  RETURN jsonb_build_object(
    'offers', v_offers, 'email_templates', v_emails,
    'script_sections', v_scripts, 'objections', v_objections,
    'next_action_presets', v_presets,
    'pipeline_steps', v_steps, 'pipeline_decisions', v_decisions
  );
END;
$$;
