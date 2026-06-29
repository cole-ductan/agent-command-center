
ALTER TABLE public.google_tokens DROP CONSTRAINT IF EXISTS google_tokens_user_id_key;
ALTER TABLE public.google_tokens
  ADD CONSTRAINT google_tokens_tenant_user_unique UNIQUE (tenant_id, user_id);
