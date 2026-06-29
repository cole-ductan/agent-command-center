
-- Public read for workspace logos; tenant admins can write to their own tenant folder.
CREATE POLICY "public read workspace-logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'workspace-logos');

CREATE POLICY "tenant admins write workspace-logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'workspace-logos'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins update workspace-logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "tenant admins delete workspace-logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'workspace-logos'
    AND public.is_tenant_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  );
