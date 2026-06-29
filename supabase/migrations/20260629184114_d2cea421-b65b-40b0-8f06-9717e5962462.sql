CREATE OR REPLACE FUNCTION public.create_workspace(
  p_name text,
  p_slug text,
  p_industry text DEFAULT NULL,
  p_template_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text := nullif(btrim(p_name), '');
  v_base_slug text := lower(regexp_replace(coalesce(nullif(btrim(p_slug), ''), 'workspace'), '[^a-z0-9]+', '-', 'g'));
  v_slug text;
  v_attempt integer := 0;
  v_tenant public.tenants%rowtype;
  v_template record;
  v_template_result jsonb := NULL;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Workspace name is required';
  END IF;

  v_base_slug := trim(both '-' from v_base_slug);
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'workspace';
  END IF;
  v_base_slug := left(v_base_slug, 60);
  v_slug := v_base_slug;

  LOOP
    BEGIN
      INSERT INTO public.tenants (name, slug, industry, created_by)
      VALUES (v_name, v_slug, nullif(btrim(p_industry), ''), v_user)
      RETURNING * INTO v_tenant;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      v_slug := left(v_base_slug, greatest(1, 60 - length(v_attempt::text) - 1)) || '-' || v_attempt::text;
      IF v_attempt > 50 THEN
        RAISE EXCEPTION 'Could not create a unique workspace slug';
      END IF;
    END;
  END LOOP;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_tenant.id, v_user, 'owner')
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.profiles
  SET active_tenant_id = v_tenant.id,
      updated_at = now()
  WHERE id = v_user;

  IF p_template_id IS NOT NULL THEN
    SELECT id, slug, name INTO v_template
    FROM public.command_center_templates
    WHERE id = p_template_id;

    IF v_template.id IS NULL THEN
      RAISE EXCEPTION 'Starter template not found';
    END IF;

    IF v_template.slug <> 'blank' THEN
      v_template_result := public.apply_template(v_tenant.id, v_template.id);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'tenant', jsonb_build_object(
      'id', v_tenant.id,
      'slug', v_tenant.slug,
      'name', v_tenant.name,
      'industry', v_tenant.industry,
      'logo_url', v_tenant.logo_url,
      'brand_color', v_tenant.brand_color,
      'settings', v_tenant.settings
    ),
    'role', 'owner',
    'template_result', v_template_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_workspace(text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace(text, text, text, uuid) TO service_role;