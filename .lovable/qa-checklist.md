# Command Center — QA Checklist

Walk top → bottom. Each item is independent enough to check off on its own. If something fails, note the error message next to the box and move on so we get a full picture before fixing.

Legend: `[ ]` todo · `[x]` pass · `[!]` bug (add note)

---

## 0. Pre-flight (one-time)

- [ ] Signed in with a real account (not the demo user)
- [ ] Browser console open, Network tab open, errors visible
- [ ] Know which workspace you are in (top-left chip in AppShell)

---

## 1. Auth & Onboarding

- [ ] `/auth` loads, Google sign-in button visible
- [ ] Google OAuth completes and returns to app (no redirect loop)
- [ ] First-time user is sent to `/onboarding` automatically
- [ ] `/onboarding` lists at least the **Blank** and **Dixon Golf Charity Events** templates
- [ ] Creating a workspace with **Blank** succeeds, lands on `/`
- [ ] Creating a workspace with **Dixon Golf** succeeds and toast says "Loaded … starter content"
- [ ] `profiles.active_tenant_id` is set to the new workspace (verify in Settings → Workspace)
- [ ] **Known bug:** "new row violates row-level security policy for table tenants" — repro and capture the exact `auth.uid()` vs `created_by` payload from Network tab

---

## 2. Workspace switching & tenant scoping

- [ ] AppShell shows the active workspace name
- [ ] Create a second workspace → switcher lists both
- [ ] Switching workspaces reloads tenant-scoped data (offers, scripts, objections all change)
- [ ] Data created in Workspace A is NOT visible in Workspace B (open Notes, Leads, Offers in each)

---

## 3. Invites (`/invite/$token`)

- [ ] As admin: Settings → Members → invite a second email, copy the token
- [ ] Open `/invite/<token>` in an incognito window
- [ ] Signed-out state shows "Sign in to accept" CTA → redirects to `/auth` → returns to invite after login
- [ ] Wrong-email account sees clear error ("invite was sent to a different email")
- [ ] Correct email accepts → lands on `/` inside the new workspace
- [ ] Re-opening the same token shows "already used"
- [ ] Expired invite shows "expired"

---

## 4. Google integration (per-workspace)

- [ ] Settings → Workspace → "Connect Google" launches OAuth
- [ ] Returns to app, status flips to Connected
- [ ] `google_tokens` row has the **current** `tenant_id` (not null, not a different workspace)
- [ ] Sending a test email from the Call cockpit logs an `emails` row with the right `tenant_id`
- [ ] Switching to a workspace with no Google connection shows "Not connected" (does NOT leak the other workspace's token)
- [ ] Disconnect button removes the row for **this** workspace only

---

## 5. Storage isolation

- [ ] Settings → Training Docs: upload a PDF → file lands at `training-docs/<tenantId>/...`
- [ ] Settings → Workspace: upload a logo → file lands at `org-branding/<tenantId>/...`
- [ ] Offer PDF upload lands at `offer-pdfs/<tenantId>/<slug>/...`
- [ ] From Workspace B, the file list does NOT show Workspace A's files
- [ ] Direct GET on a Workspace A storage path while signed in as Workspace B returns 403

---

## 6. Settings (admin-gated)

- [ ] As **owner/admin**: Settings tabs all load (Workspace, Members, Templates, Objections, Training Docs)
- [ ] As **member** (non-admin): destructive actions (remove member, delete objection, apply template) are hidden or disabled
- [ ] Apply Template button on Settings → Templates works and toasts row counts
- [ ] Editing an objection persists; reload still shows the change
- [ ] Editing an email template persists
- [ ] Editing a script section persists

---

## 7. Call Cockpit (`/call`)

- [ ] Page loads without console errors
- [ ] Pipeline steps render (currently still from `src/lib/pipeline.ts` — **DB wiring deferred**)
- [ ] Decisions buttons advance the step
- [ ] Capture fields save to the lead/call record
- [ ] Send email from cockpit uses the connected Google account
- [ ] Notes tray opens, saves, reloads

---

## 8. Playbook (`/playbook`)

- [ ] Page loads
- [ ] Objections list renders (currently hardcoded — **DB wiring deferred**)
- [ ] Scripts render
- [ ] Search / filter works

---

## 9. My Week / Dashboard / Notes / Leads

- [ ] `/` dashboard renders, counts match DB
- [ ] `/my-week` renders weekly goals, edits persist
- [ ] `/notes` create + folder works, RLS-scoped
- [ ] Add Lead dialog creates a contact with the right `tenant_id`

---

## 10. RLS sanity sweep (run SQL)

For each tenant-scoped table, confirm no row leaks across tenants:

```sql
select 'contacts' t, count(*) from contacts
union all select 'offers', count(*) from offers
union all select 'objections', count(*) from objections
union all select 'script_sections', count(*) from script_sections
union all select 'email_templates', count(*) from email_templates
union all select 'pipeline_steps', count(*) from pipeline_steps
union all select 'pipeline_decisions', count(*) from pipeline_decisions
union all select 'training_documents', count(*) from training_documents
union all select 'google_tokens', count(*) from google_tokens
union all select 'emails', count(*) from emails
union all select 'notes', count(*) from notes;
```

Run as Workspace A, then again as Workspace B — counts should differ and never include the other workspace's rows.

---

## 11. Known deferred items (not bugs, just not built yet)

- [ ] Call cockpit reads from `pipeline_steps` / `pipeline_decisions` instead of `src/lib/pipeline.ts`
- [ ] Playbook reads from `objections` / `script_sections` instead of hardcoded catalogs
- [ ] AI agent
- [ ] Drop legacy `organizations` table (kept for now; confirm nothing reads it before removing)

---

## How to report a failure back to me

For each `[!]`, paste:
1. Which checklist item
2. The exact error (toast text + console message + network response body)
3. Which workspace + user you were signed in as

I'll batch the fixes by area.
