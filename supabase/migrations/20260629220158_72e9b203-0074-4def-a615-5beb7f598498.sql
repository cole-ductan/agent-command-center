
-- 1) Extend apply_template to merge tenant_settings from template payload into tenants.settings
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
  IF NOT public.is_tenant_member(p_tenant_id, v_user) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
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

  -- Merge template-provided tenant_settings (e.g. product_catalog_url) into tenants.settings
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

-- 2) Add the Dixon catalog URL to the Dixon template payload
UPDATE public.template_payloads
   SET content = content || jsonb_build_object(
     'tenant_settings', jsonb_build_object(
       'product_catalog_url', 'https://dixongolf.com'
     )
   )
 WHERE template_id = 'cb1530fe-4e12-4c59-a659-66cf8b3dd27a';

-- 3) Backfill: any existing workspace that has Dixon offers seeded gets the catalog URL
UPDATE public.tenants t
   SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('product_catalog_url', 'https://dixongolf.com'),
       updated_at = now()
 WHERE NOT (COALESCE(settings, '{}'::jsonb) ? 'product_catalog_url')
   AND EXISTS (
     SELECT 1 FROM public.offers o
      WHERE o.tenant_id = t.id
        AND o.slug IN (
          SELECT (x->>'slug') FROM jsonb_array_elements(
            (SELECT content->'offers' FROM public.template_payloads WHERE template_id = 'cb1530fe-4e12-4c59-a659-66cf8b3dd27a')
          ) x
        )
   );
