ALTER TABLE public.next_action_presets
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS offset_days INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS next_action_presets_tenant_slug_key
  ON public.next_action_presets (tenant_id, slug)
  WHERE slug IS NOT NULL;