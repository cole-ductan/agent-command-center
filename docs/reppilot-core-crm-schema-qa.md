# RepPilot Core CRM schema QA

This PR starts the neutral RepPilot foundation beside the existing legacy Dixon/tournament-shaped schema.

## Scope

Adds neutral, tenant-scoped tables:

- `companies`
- `people`
- `opportunities`
- `opportunity_people`
- `interactions`
- `workflow_configs`
- `workflow_steps`
- `workflow_capture_fields`
- `workflow_decision_branches`
- `dashboard_widgets`
- `weekly_score_rules`

Extends existing tenant-scoped tables:

- `tasks.company_id`
- `tasks.person_id`
- `tasks.opportunity_id`
- `notes.company_id`
- `notes.person_id`
- `notes.opportunity_id`

## Intentional non-goals

- No legacy tables are deleted or renamed.
- No full UI migration is included.
- No Gmail scopes are changed or re-enabled.
- No generic sales template seed is included yet.
- No AI setup/import agent is included yet.

## Review checklist

### Migration safety

- [ ] Migration applies cleanly on a Supabase branch or local database.
- [ ] Existing legacy tables still exist after migration:
  - `events`
  - `contacts`
  - `organizations`
  - `calls`
  - `pipeline_steps`
  - `pipeline_decisions`
- [ ] Existing workspace/member behavior still works.
- [ ] Existing delete workspace flow still removes tenant data through tenant cascade and existing cleanup logic.

### Tenant scoping

- [ ] Every new table has `tenant_id`.
- [ ] Every new table has RLS enabled.
- [ ] Core CRM tables allow CRUD only for tenant members.
- [ ] Configuration tables allow SELECT for tenant members.
- [ ] Configuration tables allow writes only for tenant admins/owners.
- [ ] Composite tenant foreign keys prevent cross-workspace relationships.

### Neutral CRM model

- [ ] A company can be created without golf/tournament fields.
- [ ] A person can optionally attach to a company.
- [ ] An opportunity can optionally attach to a company and primary person.
- [ ] Multiple people can attach to one opportunity through `opportunity_people`.
- [ ] Interactions can attach to a company, person, and/or opportunity.
- [ ] Tasks and notes can attach to neutral CRM records without depending on legacy `events`.

### Future setup modes

The schema should support future PRs for:

- Clean Slate
- Generic Sales Default
- Industry Templates
- Upload My Workflow
- Manual workflow builder
- AI import preview and approval

## Next PR after this

Suggested next PR:

`feature/reppilot-blank-crm-dashboard-foundation`

Recommended scope:

- Add read-only/placeholder blank CRM dashboard sections for:
  - Quick Add
  - People
  - Companies
  - Opportunities
  - Tasks
  - Notes
  - Today’s Work
- Start wiring UI reads to the new neutral tables where safe.
- Do not migrate Call Cockpit yet unless the schema PR is verified first.
