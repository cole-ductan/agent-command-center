# Master Agent CRM — White-Label Command Center

Turn the Dixon-specific CRM into a SaaS where any company creates their own command center. Phase 1 ships the multi-tenant editable shell with Dixon preserved as a starter template. Phase 2 adds the AI builder.

---

## Phase 1 — Multi-tenant editable shell (this pass)

### 1. Tenancy model

- `organizations` already exists — promote it to first-class tenant: `name`, `slug`, `created_by`, `industry`, `logo_url`, `brand_color`, `settings jsonb`.
- New `organization_members` table: `org_id`, `user_id`, `role` (`owner` | `admin` | `member`), unique on (org, user).
- New `app_role` enum stays per-user globally (`super_admin`) for platform-level access; org-level role lives on `organization_members`.
- New `org_invites` table: `org_id`, `email`, `role`, `token`, `expires_at`, `accepted_at`.
- Every existing user-data table (`events`, `contacts`, `calls`, `notes`, `note_folders`, `tasks`, `emails`, `email_templates`, `offers`, `script_sections`, `next_action_presets`, `weekly_goals`, `point_logs`, `offer_pdfs`, `cm_schedules`) gets an `org_id uuid` column.
- RLS rewritten: `user_id = auth.uid()` becomes `org_id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())`. Helper SQL function `is_org_member(_org uuid, _user uuid)` to avoid recursion.
- Active org per user: `profiles.active_org_id` (or session-scoped in client). All queries filter by active org.

### 2. Configurable command center (everything user-editable)

The 11-step Dixon pipeline in `src/lib/pipeline.ts` is currently hardcoded. Move it to the DB so each org owns its own pipeline.

New tables (all `org_id`-scoped):
- `pipeline_steps`: slug, number, emoji, title, subtitle, script_lines (jsonb), checklist (jsonb), capture_fields (jsonb), callout (jsonb), sort_order
- `pipeline_decisions`: step_id, label, goto_slug, patch (jsonb), variant, sort_order
- `objections`: slug, trigger, response, tip, sort_order
- `stages`: id, label, color_token, sort_order — replaces the hardcoded `STAGES` array in `src/lib/stages.ts`
- `capture_fields`: key, label, type (text/number/date/bool/select), options (jsonb), category, sort_order — drives the dynamic Live Call form
- `offer_documents`: replaces `localOfferPdfs.ts` / `offerPdfMap.ts`. Org uploads PDFs to a per-org bucket path, links them to offers.
- `training_documents`: any uploaded PDFs/docs the team can reference (separate from offer PDFs).

`offers`, `email_templates`, `script_sections`, `next_action_presets` already exist — add `org_id`, drop the user_id-scoped seed.

### 3. Onboarding & starter templates

New tables:
- `command_center_templates`: name, description, industry, is_official, preview_image
- `template_payloads`: template_id, content (jsonb) — full bundle (stages, steps, decisions, objections, offers, email_templates, script_sections, next_action_presets, capture_fields, sample PDFs reference list)

On org creation, the user picks: **Blank** or **Dixon Golf Charity Events** (built from the existing seed). Template clone copies all rows into the new org and uploads sample PDFs to org's storage path.

Seed migration converts the current `seed_dixon_content_for_user` trigger output into the Dixon template payload, then drops the auto-seed trigger.

### 4. Branding & UI

- App shell pulls org name + logo + brand color instead of "Dixon" anywhere.
- `src/components/AppShell.tsx` nav becomes config-driven: org admins can hide/show nav items (Pipeline, Playbook, Calendar, etc.) via `settings.enabled_modules`.
- Remove remaining Dixon copy from `playbook.tsx`, `call.tsx`, sample data, db note helpers.
- Org switcher in the header for users in multiple orgs.

### 5. Storage

- `offer-pdfs` bucket already exists. Path becomes `{org_id}/offers/{file}`. RLS on `storage.objects` scoped to org membership.
- New `training-docs` bucket, same path pattern.
- New `org-branding` public bucket for logos.

### 6. Routes & screens

New:
- `/onboarding` — create first org or accept invite, pick starter template.
- `/settings/organization` — name, logo, color, modules toggle, invites/members management.
- `/settings/pipeline` — CRUD on stages, steps, decisions, capture fields.
- `/settings/objections` — CRUD.
- `/settings/templates` — browse/apply additional starter templates anytime.
- `/settings/training-docs` — upload reference docs.

Existing routes stay but read from DB-backed pipeline/stages instead of `src/lib/pipeline.ts` / `stages.ts`.

### 7. Technical migration outline

```text
1. supabase--migration: organizations upgrade, organization_members, org_invites,
   is_org_member() helper, app_role enum kept for platform roles
2. supabase--migration: add org_id to all data tables, backfill, rewrite RLS
3. supabase--migration: pipeline_steps, pipeline_decisions, objections, stages,
   capture_fields, offer_documents, training_documents, command_center_templates,
   template_payloads
4. supabase--migration: convert seed_dixon_content_for_user into a Dixon
   template payload row; drop user-level seed trigger
5. Build template-clone server fn (createServerFn) — copies a template payload
   into a new org
6. Refactor src/lib/pipeline.ts and src/lib/stages.ts into hooks that read from
   DB (useQuery), with the seed objects only used by the template builder
7. Build onboarding flow + org switcher + settings screens
8. Strip Dixon strings/branding from shared UI; add org branding pull-through
9. Update src/lib/localOfferPdfs.ts / offerPdfMap.ts → DB-driven
   offer_documents
```

---

## Phase 2 — AI builder (next pass, separate plan)

After phase 1 is solid, layer in:
- **Doc ingestion** — upload PDFs/docs → AI parses into pipeline steps, offers, objections, email templates → user reviews/accepts.
- **Conversational onboarding wizard** — AI interviews the user about their business and drafts the initial command center.
- **Always-available "edit my command center" assistant** — sidebar chat with tools to create/update stages, steps, offers, emails, capture fields.

Built on the AI SDK + Lovable AI Gateway, using `createServerFn` tool handlers that write to the same tables the settings UI uses.

---

## What gets deleted vs preserved

**Preserved:** all current Dixon scripts, offers, emails, objections, PDFs — bundled into the Dixon starter template payload so any new org can clone it.

**Deleted from defaults:** `seed_dixon_content_for_user` trigger, hardcoded `PIPELINE_STEPS` / `OBJECTIONS` / `STAGES` constants, Dixon copy in shell/auth/branding, hardcoded `localOfferPdfs.ts` / `offerPdfMap.ts` paths.

---

## Open question before I start

Phase 1 is a meaningful migration (rewriting RLS on ~15 tables, building 4–5 new settings screens, onboarding flow). Want me to go end-to-end on Phase 1 in one pass, or split it into two PRs — **(a)** tenancy + RLS + Dixon-as-template, then **(b)** settings screens for pipeline/stages/objections editing? Split is safer; one-pass is faster.