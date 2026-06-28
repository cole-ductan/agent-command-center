
-- ============================================================
-- Phase 1a, Migration 1: SaaS tenancy foundation
-- ============================================================

-- 1. Profiles table (per-user app data, including active tenant)
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  active_tenant_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_profile_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own_profile_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tenants (the SaaS customer = a company using this CRM)
CREATE TABLE public.tenants (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  industry TEXT,
  logo_url TEXT,
  brand_color TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER tenants_updated BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tenant role enum
CREATE TYPE public.tenant_role AS ENUM ('owner', 'admin', 'member');

-- 4. Tenant members
CREATE TABLE public.tenant_members (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.tenant_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX tenant_members_user_idx ON public.tenant_members(user_id);
CREATE INDEX tenant_members_tenant_idx ON public.tenant_members(tenant_id);

-- 5. Tenant invites
CREATE TABLE public.tenant_invites (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.tenant_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_invites TO authenticated;
GRANT ALL ON public.tenant_invites TO service_role;
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

-- 6. Helper: security-definer membership check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_tenant_member(_tenant_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = _tenant_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_role_of(_tenant_id UUID, _user_id UUID)
RETURNS public.tenant_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.tenant_members
  WHERE tenant_id = _tenant_id AND user_id = _user_id
  LIMIT 1;
$$;

-- 7. Policies that use the helper
CREATE POLICY "tenant_select_members" ON public.tenants
  FOR SELECT USING (public.is_tenant_member(id, auth.uid()));
CREATE POLICY "tenant_insert_creator" ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "tenant_update_admins" ON public.tenants
  FOR UPDATE USING (public.tenant_role_of(id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "tenant_delete_owners" ON public.tenants
  FOR DELETE USING (public.tenant_role_of(id, auth.uid()) = 'owner');

CREATE POLICY "tm_select_self_tenant" ON public.tenant_members
  FOR SELECT USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "tm_insert_admins" ON public.tenant_members
  FOR INSERT WITH CHECK (
    public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin')
    OR (user_id = auth.uid() AND NOT EXISTS (
      SELECT 1 FROM public.tenant_members WHERE tenant_id = tenant_members.tenant_id
    ))
  );
CREATE POLICY "tm_update_admins" ON public.tenant_members
  FOR UPDATE USING (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "tm_delete_admins_or_self" ON public.tenant_members
  FOR DELETE USING (
    public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin')
    OR user_id = auth.uid()
  );

CREATE POLICY "inv_select_admins" ON public.tenant_invites
  FOR SELECT USING (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "inv_insert_admins" ON public.tenant_invites
  FOR INSERT WITH CHECK (
    public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin')
    AND invited_by = auth.uid()
  );
CREATE POLICY "inv_update_admins" ON public.tenant_invites
  FOR UPDATE USING (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin'));
CREATE POLICY "inv_delete_admins" ON public.tenant_invites
  FOR DELETE USING (public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin'));

-- 8. Profile auto-create on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Backfill profiles for existing users
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 10. Disable the existing Dixon auto-seed triggers so new signups
--     do NOT get the hardcoded Dixon content anymore.
--     (Phase 1b will apply templates explicitly during onboarding.)
DROP TRIGGER IF EXISTS on_auth_user_created_seed_dixon ON auth.users;
DROP TRIGGER IF EXISTS seed_dixon_on_user_create ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_dixon ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_presets ON auth.users;
DROP TRIGGER IF EXISTS seed_next_actions_on_user_create ON auth.users;
