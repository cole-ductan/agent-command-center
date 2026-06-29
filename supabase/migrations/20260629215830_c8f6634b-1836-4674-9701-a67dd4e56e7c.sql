
-- 1) google_tokens: drop redundant policies that don't enforce tenant scope.
DROP POLICY IF EXISTS own_google_tokens_select ON public.google_tokens;
DROP POLICY IF EXISTS own_google_tokens_insert ON public.google_tokens;
DROP POLICY IF EXISTS own_google_tokens_update ON public.google_tokens;
DROP POLICY IF EXISTS own_google_tokens_delete ON public.google_tokens;

-- Ensure a SELECT policy exists for tenant-scoped reads (existing set only had owner/insert/update/delete tenant-scoped ones)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'public.google_tokens'::regclass
      AND polname = 'Owner user can select google tokens'
  ) THEN
    CREATE POLICY "Owner user can select google tokens"
      ON public.google_tokens FOR SELECT
      USING (auth.uid() = user_id AND public.is_tenant_member(tenant_id, auth.uid()));
  END IF;
END $$;

-- 2) offer-pdfs storage: remove public-read policies; keep only tenant-scoped access.
DROP POLICY IF EXISTS "Offer PDFs are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS offer_pdfs_public_read ON storage.objects;
-- Also drop the older per-user folder policies (the new tenant-scoped ones are sufficient).
DROP POLICY IF EXISTS "Users can delete their own offer PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own offer PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own offer PDFs" ON storage.objects;
DROP POLICY IF EXISTS offer_pdfs_user_delete ON storage.objects;
DROP POLICY IF EXISTS offer_pdfs_user_update ON storage.objects;
DROP POLICY IF EXISTS offer_pdfs_user_write ON storage.objects;

-- 3) tenant_members: fix broken self-insert clause. Only owners/admins can insert directly;
--    regular users join via SECURITY DEFINER RPCs (create_workspace, accept_tenant_invite).
DROP POLICY IF EXISTS tm_insert_admins ON public.tenant_members;
CREATE POLICY tm_insert_admins_only
  ON public.tenant_members FOR INSERT
  WITH CHECK (
    public.tenant_role_of(tenant_id, auth.uid()) IN ('owner','admin')
  );
