
-- ============================================================
-- Phase 1a · Migration 2: tenant_id on all data tables + RLS rewrite
-- ============================================================

-- 1. Add tenant_id (nullable) to every data table
ALTER TABLE public.events              ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.contacts            ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.calls               ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.notes               ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.note_folders        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.tasks               ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.emails              ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.email_templates     ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.offers              ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.script_sections     ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.next_action_presets ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.weekly_goals        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.point_logs          ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.offer_pdfs          ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cm_schedules        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.organizations       ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 2. Create a personal tenant for every existing user who has any data, add them as owner
DO $$
DECLARE
  u RECORD;
  new_tenant_id UUID;
  base_slug TEXT;
  final_slug TEXT;
  attempt INT;
BEGIN
  FOR u IN SELECT id, email FROM auth.users LOOP
    base_slug := lower(regexp_replace(coalesce(split_part(u.email,'@',1), 'workspace'), '[^a-z0-9]+', '-', 'g'));
    IF base_slug = '' THEN base_slug := 'workspace'; END IF;
    final_slug := base_slug;
    attempt := 0;
    WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = final_slug) LOOP
      attempt := attempt + 1;
      final_slug := base_slug || '-' || attempt;
    END LOOP;

    INSERT INTO public.tenants (slug, name, created_by)
    VALUES (final_slug, coalesce(u.email, 'Workspace') || '''s Workspace', u.id)
    RETURNING id INTO new_tenant_id;

    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (new_tenant_id, u.id, 'owner');

    UPDATE public.profiles SET active_tenant_id = new_tenant_id WHERE id = u.id;

    UPDATE public.events              SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.contacts            SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.calls               SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.notes               SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.note_folders        SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.tasks               SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.emails              SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.email_templates     SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.offers              SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.script_sections     SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.next_action_presets SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.weekly_goals        SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.point_logs          SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.offer_pdfs          SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.cm_schedules        SET tenant_id = new_tenant_id WHERE user_id = u.id;
    UPDATE public.organizations       SET tenant_id = new_tenant_id WHERE user_id = u.id;
  END LOOP;
END $$;

-- 3. Delete any orphan rows (defensive)
DELETE FROM public.events              WHERE tenant_id IS NULL;
DELETE FROM public.contacts            WHERE tenant_id IS NULL;
DELETE FROM public.calls               WHERE tenant_id IS NULL;
DELETE FROM public.notes               WHERE tenant_id IS NULL;
DELETE FROM public.note_folders        WHERE tenant_id IS NULL;
DELETE FROM public.tasks               WHERE tenant_id IS NULL;
DELETE FROM public.emails              WHERE tenant_id IS NULL;
DELETE FROM public.email_templates     WHERE tenant_id IS NULL;
DELETE FROM public.offers              WHERE tenant_id IS NULL;
DELETE FROM public.script_sections     WHERE tenant_id IS NULL;
DELETE FROM public.next_action_presets WHERE tenant_id IS NULL;
DELETE FROM public.weekly_goals        WHERE tenant_id IS NULL;
DELETE FROM public.point_logs          WHERE tenant_id IS NULL;
DELETE FROM public.offer_pdfs          WHERE tenant_id IS NULL;
DELETE FROM public.cm_schedules        WHERE tenant_id IS NULL;
DELETE FROM public.organizations       WHERE tenant_id IS NULL;

-- 4. Make tenant_id NOT NULL
ALTER TABLE public.events              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.contacts            ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.calls               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.notes               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.note_folders        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.tasks               ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.emails              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.email_templates     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.offers              ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.script_sections     ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.next_action_presets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.weekly_goals        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.point_logs          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.offer_pdfs          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.cm_schedules        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.organizations       ALTER COLUMN tenant_id SET NOT NULL;

-- 5. Indexes
CREATE INDEX events_tenant_idx              ON public.events(tenant_id);
CREATE INDEX contacts_tenant_idx            ON public.contacts(tenant_id);
CREATE INDEX calls_tenant_idx               ON public.calls(tenant_id);
CREATE INDEX notes_tenant_idx               ON public.notes(tenant_id);
CREATE INDEX note_folders_tenant_idx        ON public.note_folders(tenant_id);
CREATE INDEX tasks_tenant_idx               ON public.tasks(tenant_id);
CREATE INDEX emails_tenant_idx              ON public.emails(tenant_id);
CREATE INDEX email_templates_tenant_idx     ON public.email_templates(tenant_id);
CREATE INDEX offers_tenant_idx              ON public.offers(tenant_id);
CREATE INDEX script_sections_tenant_idx     ON public.script_sections(tenant_id);
CREATE INDEX next_action_presets_tenant_idx ON public.next_action_presets(tenant_id);
CREATE INDEX weekly_goals_tenant_idx        ON public.weekly_goals(tenant_id);
CREATE INDEX point_logs_tenant_idx          ON public.point_logs(tenant_id);
CREATE INDEX offer_pdfs_tenant_idx          ON public.offer_pdfs(tenant_id);
CREATE INDEX cm_schedules_tenant_idx        ON public.cm_schedules(tenant_id);
CREATE INDEX organizations_tenant_idx       ON public.organizations(tenant_id);

-- 6. Drop existing user-scoped policies, add tenant-scoped policies
DO $$
DECLARE
  t TEXT;
  data_tables TEXT[] := ARRAY[
    'events','contacts','calls','notes','note_folders','tasks',
    'emails','email_templates','offers','script_sections',
    'next_action_presets','weekly_goals','point_logs','offer_pdfs',
    'cm_schedules','organizations'
  ];
  p RECORD;
BEGIN
  FOREACH t IN ARRAY data_tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "tenant_select" ON public.%I FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()))', t);
    EXECUTE format(
      'CREATE POLICY "tenant_insert" ON public.%I FOR INSERT WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()))', t);
    EXECUTE format(
      'CREATE POLICY "tenant_update" ON public.%I FOR UPDATE USING (public.is_tenant_member(tenant_id, auth.uid()))', t);
    EXECUTE format(
      'CREATE POLICY "tenant_delete" ON public.%I FOR DELETE USING (public.is_tenant_member(tenant_id, auth.uid()))', t);
  END LOOP;
END $$;

-- 7. profiles.active_tenant_id FK now that tenants exist
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_active_tenant_fk
  FOREIGN KEY (active_tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

-- 8. Drop the Dixon seed functions entirely (no longer used; templates take over)
DROP FUNCTION IF EXISTS public.seed_dixon_content_for_user() CASCADE;
DROP FUNCTION IF EXISTS public.seed_next_action_presets_for_user() CASCADE;
