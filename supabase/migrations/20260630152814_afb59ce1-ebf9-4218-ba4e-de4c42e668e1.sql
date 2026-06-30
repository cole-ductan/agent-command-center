-- ============================================================
-- RepPilot Core CRM schema foundation (PR #8)
-- ============================================================
-- Adds neutral, tenant-scoped CRM tables beside the legacy
-- Dixon/tournament-shaped tables. This migration intentionally
-- does not delete or rename legacy tables.

-- ============================================================
-- 1. Core CRM records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  domain text,
  website text,
  phone text,
  industry text,
  size_label text,
  status text NOT NULL DEFAULT 'active',
  source text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  postal_code text,
  country text,
  notes text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_tenant_id_id_key UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  first_name text,
  last_name text,
  title text,
  email text,
  phone text,
  mobile_phone text,
  linkedin_url text,
  status text NOT NULL DEFAULT 'active',
  source text,
  notes text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT people_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT people_company_tenant_fk
    FOREIGN KEY (tenant_id, company_id)
    REFERENCES public.companies(tenant_id, id)
    ON DELETE SET NULL (company_id)
);

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid,
  primary_person_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  stage_key text NOT NULL DEFAULT 'new',
  status text NOT NULL DEFAULT 'open',
  value_amount numeric,
  currency text NOT NULL DEFAULT 'USD',
  probability integer CHECK (probability IS NULL OR (probability >= 0 AND probability <= 100)),
  expected_close_date date,
  source text,
  next_step text,
  description text,
  loss_reason text,
  closed_at timestamptz,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT opportunities_company_tenant_fk
    FOREIGN KEY (tenant_id, company_id)
    REFERENCES public.companies(tenant_id, id)
    ON DELETE SET NULL (company_id),
  CONSTRAINT opportunities_primary_person_tenant_fk
    FOREIGN KEY (tenant_id, primary_person_id)
    REFERENCES public.people(tenant_id, id)
    ON DELETE SET NULL (primary_person_id)
);

CREATE TABLE IF NOT EXISTS public.opportunity_people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL,
  person_id uuid NOT NULL,
  role text,
  is_primary boolean NOT NULL DEFAULT false,
  relationship_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_people_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT opportunity_people_unique_person UNIQUE (tenant_id, opportunity_id, person_id),
  CONSTRAINT opportunity_people_opportunity_tenant_fk
    FOREIGN KEY (tenant_id, opportunity_id)
    REFERENCES public.opportunities(tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT opportunity_people_person_tenant_fk
    FOREIGN KEY (tenant_id, person_id)
    REFERENCES public.people(tenant_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid,
  person_id uuid,
  opportunity_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type text NOT NULL DEFAULT 'note',
  direction text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  subject text,
  summary text,
  outcome text,
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT interactions_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT interactions_company_tenant_fk
    FOREIGN KEY (tenant_id, company_id)
    REFERENCES public.companies(tenant_id, id)
    ON DELETE SET NULL (company_id),
  CONSTRAINT interactions_person_tenant_fk
    FOREIGN KEY (tenant_id, person_id)
    REFERENCES public.people(tenant_id, id)
    ON DELETE SET NULL (person_id),
  CONSTRAINT interactions_opportunity_tenant_fk
    FOREIGN KEY (tenant_id, opportunity_id)
    REFERENCES public.opportunities(tenant_id, id)
    ON DELETE SET NULL (opportunity_id)
);

-- ============================================================
-- 2. Extend existing notes/tasks to support neutral CRM records
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS person_id uuid,
  ADD COLUMN IF NOT EXISTS opportunity_id uuid;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS person_id uuid,
  ADD COLUMN IF NOT EXISTS opportunity_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_company_tenant_fk') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_company_tenant_fk
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES public.companies(tenant_id, id)
      ON DELETE SET NULL (company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_person_tenant_fk') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_person_tenant_fk
      FOREIGN KEY (tenant_id, person_id)
      REFERENCES public.people(tenant_id, id)
      ON DELETE SET NULL (person_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_opportunity_tenant_fk') THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_opportunity_tenant_fk
      FOREIGN KEY (tenant_id, opportunity_id)
      REFERENCES public.opportunities(tenant_id, id)
      ON DELETE SET NULL (opportunity_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_company_tenant_fk') THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_company_tenant_fk
      FOREIGN KEY (tenant_id, company_id)
      REFERENCES public.companies(tenant_id, id)
      ON DELETE SET NULL (company_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_person_tenant_fk') THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_person_tenant_fk
      FOREIGN KEY (tenant_id, person_id)
      REFERENCES public.people(tenant_id, id)
      ON DELETE SET NULL (person_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_opportunity_tenant_fk') THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_opportunity_tenant_fk
      FOREIGN KEY (tenant_id, opportunity_id)
      REFERENCES public.opportunities(tenant_id, id)
      ON DELETE SET NULL (opportunity_id);
  END IF;
END $$;

-- ============================================================
-- 3. Workflow configuration foundation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workflow_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  workflow_type text NOT NULL DEFAULT 'live_call',
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual',
  template_slug text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_configs_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT workflow_configs_tenant_slug_key UNIQUE (tenant_id, slug)
);

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_config_id uuid NOT NULL,
  slug text NOT NULL,
  step_number text,
  title text NOT NULL,
  subtitle text,
  step_type text NOT NULL DEFAULT 'standard',
  icon text,
  script_text text,
  instructions text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_steps_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT workflow_steps_tenant_config_slug_key UNIQUE (tenant_id, workflow_config_id, slug),
  CONSTRAINT workflow_steps_config_tenant_fk
    FOREIGN KEY (tenant_id, workflow_config_id)
    REFERENCES public.workflow_configs(tenant_id, id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.workflow_capture_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_config_id uuid NOT NULL,
  workflow_step_id uuid,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  target_table text,
  target_column text,
  is_required boolean NOT NULL DEFAULT false,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_value text,
  helper_text text,
  sort_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_capture_fields_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT workflow_capture_fields_tenant_config_key UNIQUE (tenant_id, workflow_config_id, field_key),
  CONSTRAINT workflow_capture_fields_config_tenant_fk
    FOREIGN KEY (tenant_id, workflow_config_id)
    REFERENCES public.workflow_configs(tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT workflow_capture_fields_step_tenant_fk
    FOREIGN KEY (tenant_id, workflow_step_id)
    REFERENCES public.workflow_steps(tenant_id, id)
    ON DELETE SET NULL (workflow_step_id)
);

CREATE TABLE IF NOT EXISTS public.workflow_decision_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_config_id uuid NOT NULL,
  from_step_id uuid NOT NULL,
  to_step_id uuid,
  branch_key text NOT NULL,
  label text NOT NULL,
  variant text,
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  patch jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_decision_branches_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT workflow_decision_branches_tenant_from_key UNIQUE (tenant_id, from_step_id, branch_key),
  CONSTRAINT workflow_decision_branches_config_tenant_fk
    FOREIGN KEY (tenant_id, workflow_config_id)
    REFERENCES public.workflow_configs(tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT workflow_decision_branches_from_step_tenant_fk
    FOREIGN KEY (tenant_id, from_step_id)
    REFERENCES public.workflow_steps(tenant_id, id)
    ON DELETE CASCADE,
  CONSTRAINT workflow_decision_branches_to_step_tenant_fk
    FOREIGN KEY (tenant_id, to_step_id)
    REFERENCES public.workflow_steps(tenant_id, id)
    ON DELETE SET NULL (to_step_id)
);

-- ============================================================
-- 4. Dashboard and scoring configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  widget_key text NOT NULL,
  title text NOT NULL,
  widget_type text NOT NULL,
  area text NOT NULL DEFAULT 'dashboard',
  width text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_widgets_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT dashboard_widgets_tenant_widget_key UNIQUE (tenant_id, widget_key)
);

CREATE TABLE IF NOT EXISTS public.weekly_score_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rule_key text NOT NULL,
  label text NOT NULL,
  description text,
  activity_type text NOT NULL,
  points numeric NOT NULL DEFAULT 1,
  target_count integer,
  period text NOT NULL DEFAULT 'weekly',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_score_rules_tenant_id_id_key UNIQUE (tenant_id, id),
  CONSTRAINT weekly_score_rules_tenant_rule_key UNIQUE (tenant_id, rule_key)
);

-- ============================================================
-- 5. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS companies_tenant_name_idx ON public.companies(tenant_id, name);
CREATE INDEX IF NOT EXISTS companies_tenant_status_idx ON public.companies(tenant_id, status);
CREATE INDEX IF NOT EXISTS companies_tenant_domain_idx ON public.companies(tenant_id, lower(domain)) WHERE domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS people_tenant_company_idx ON public.people(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS people_tenant_name_idx ON public.people(tenant_id, full_name);
CREATE INDEX IF NOT EXISTS people_tenant_email_idx ON public.people(tenant_id, lower(email)) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS opportunities_tenant_company_idx ON public.opportunities(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS opportunities_tenant_person_idx ON public.opportunities(tenant_id, primary_person_id);
CREATE INDEX IF NOT EXISTS opportunities_tenant_stage_idx ON public.opportunities(tenant_id, stage_key);
CREATE INDEX IF NOT EXISTS opportunities_tenant_status_idx ON public.opportunities(tenant_id, status);
CREATE INDEX IF NOT EXISTS opportunities_tenant_close_date_idx ON public.opportunities(tenant_id, expected_close_date) WHERE expected_close_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS opportunity_people_tenant_opp_idx ON public.opportunity_people(tenant_id, opportunity_id);
CREATE INDEX IF NOT EXISTS opportunity_people_tenant_person_idx ON public.opportunity_people(tenant_id, person_id);

CREATE INDEX IF NOT EXISTS interactions_tenant_occurred_idx ON public.interactions(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS interactions_tenant_company_idx ON public.interactions(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS interactions_tenant_person_idx ON public.interactions(tenant_id, person_id);
CREATE INDEX IF NOT EXISTS interactions_tenant_opportunity_idx ON public.interactions(tenant_id, opportunity_id);
CREATE INDEX IF NOT EXISTS interactions_tenant_type_idx ON public.interactions(tenant_id, interaction_type);

CREATE INDEX IF NOT EXISTS tasks_tenant_company_idx ON public.tasks(tenant_id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_tenant_person_idx ON public.tasks(tenant_id, person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_tenant_opportunity_idx ON public.tasks(tenant_id, opportunity_id) WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS notes_tenant_company_idx ON public.notes(tenant_id, company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notes_tenant_person_idx ON public.notes(tenant_id, person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notes_tenant_opportunity_idx ON public.notes(tenant_id, opportunity_id) WHERE opportunity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS workflow_configs_tenant_type_idx ON public.workflow_configs(tenant_id, workflow_type);
CREATE INDEX IF NOT EXISTS workflow_steps_tenant_config_order_idx ON public.workflow_steps(tenant_id, workflow_config_id, sort_order);
CREATE INDEX IF NOT EXISTS workflow_capture_fields_tenant_config_order_idx ON public.workflow_capture_fields(tenant_id, workflow_config_id, sort_order);
CREATE INDEX IF NOT EXISTS workflow_decision_branches_tenant_from_order_idx ON public.workflow_decision_branches(tenant_id, from_step_id, sort_order);
CREATE INDEX IF NOT EXISTS dashboard_widgets_tenant_area_order_idx ON public.dashboard_widgets(tenant_id, area, sort_order);
CREATE INDEX IF NOT EXISTS weekly_score_rules_tenant_active_order_idx ON public.weekly_score_rules(tenant_id, is_active, sort_order);

-- ============================================================
-- 6. Grants, RLS and update triggers
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'companies',
    'people',
    'opportunities',
    'opportunity_people',
    'interactions'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'members read ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'members insert ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'members update ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'members delete ' || t, t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()))',
      'members read ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()))',
      'members insert ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid())) WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()))',
      'members update ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()))',
      'members delete ' || t, t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t, t
    );
  END LOOP;
END $$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'workflow_configs',
    'workflow_steps',
    'workflow_capture_fields',
    'workflow_decision_branches',
    'dashboard_widgets',
    'weekly_score_rules'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'members read ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admins write ' || t, t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()))',
      'members read ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_tenant_admin(tenant_id, auth.uid())) WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()))',
      'admins write ' || t, t
    );

    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- 7. Documentation comments
-- ============================================================

COMMENT ON TABLE public.companies IS 'Neutral RepPilot company/account table. Future replacement for legacy organizations.';
COMMENT ON TABLE public.people IS 'Neutral RepPilot people/contact table. Future replacement for legacy contacts.';
COMMENT ON TABLE public.opportunities IS 'Neutral RepPilot sales opportunity table. Future replacement for legacy tournament-shaped events.';
COMMENT ON TABLE public.opportunity_people IS 'Many-to-many relationship between opportunities and people.';
COMMENT ON TABLE public.interactions IS 'Neutral activity timeline for calls, meetings, emails, notes, and other touches.';
COMMENT ON TABLE public.workflow_configs IS 'Workspace-owned workflow definitions for guided selling flows.';
COMMENT ON TABLE public.workflow_steps IS 'Ordered workflow steps loaded by guided call or future workflow UIs.';
COMMENT ON TABLE public.workflow_capture_fields IS 'Configurable fields captured during workflows.';
COMMENT ON TABLE public.workflow_decision_branches IS 'Configurable decision buttons/branches between workflow steps.';
COMMENT ON TABLE public.dashboard_widgets IS 'Workspace dashboard widget configuration.';
COMMENT ON TABLE public.weekly_score_rules IS 'Workspace scoring rules for weekly activity scorecards.';