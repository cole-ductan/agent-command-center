# RepPilot neutral Quick Add QA

This PR enables the Quick Add tiles on the root Workspace Command Center.

## Scope

Adds create flows for neutral RepPilot Core CRM records:

- Company
- Person
- Opportunity
- Task
- Note

## Files changed

- `src/routes/_app/index.tsx`
- `src/components/QuickAddCrmDialog.tsx`
- `docs/reppilot-quick-add-crm-records-qa.md`

## Intentional non-goals

- Does not migrate `/call`.
- Does not migrate `/pipeline`.
- Does not delete legacy tables.
- Does not add full record detail pages.
- Does not add edit/delete flows yet.
- Does not change Gmail scopes.
- Does not regenerate Supabase TypeScript types yet.

## Manual QA checklist

### Dashboard smoke test

- [ ] Root dashboard loads for an authenticated user with an active workspace.
- [ ] Existing navigation still works:
  - Start Call
  - Pipeline
  - Follow-Ups
- [ ] Quick Add tiles are clickable.
- [ ] Dialog opens for each tile.
- [ ] Cancel closes each dialog.

### Company creation

- [ ] Click Company.
- [ ] Try saving without a name and confirm validation appears.
- [ ] Save a company with name, industry, phone, website, and notes.
- [ ] Companies count increases.
- [ ] New company appears in Company dropdowns for Person, Opportunity, Task, and Note.

### Person creation

- [ ] Click Person.
- [ ] Try saving without a name and confirm validation appears.
- [ ] Save a person with name, optional company, title, phone, and email.
- [ ] People count increases.
- [ ] New person appears in Person dropdowns for Opportunity, Task, and Note.

### Opportunity creation

- [ ] Click Opportunity.
- [ ] Try saving without a name and confirm validation appears.
- [ ] Save an opportunity with optional company, optional primary person, stage, value, close date, and next step.
- [ ] Opportunities count increases.
- [ ] New opportunity appears under Recent Opportunities.
- [ ] If primary person was selected, verify `opportunity_people` has the primary relationship.

### Task creation

- [ ] Click Task.
- [ ] Try saving without a task title and confirm validation appears.
- [ ] Save a task with due date, priority, and optional CRM context.
- [ ] Tasks count increases.
- [ ] If due date is today, task appears under Today’s Work.
- [ ] If due date is in the future, task appears under Upcoming.

### Note creation

- [ ] Click Note.
- [ ] Try saving without note body and confirm validation appears.
- [ ] Save a note with optional title and CRM context.
- [ ] Notes count increases.

### Data guardrails

- [ ] Company insert writes to `companies`, not legacy `organizations`.
- [ ] Person insert writes to `people`, not legacy `contacts`.
- [ ] Opportunity insert writes to `opportunities`, not legacy `events`.
- [ ] Task insert can attach to company/person/opportunity without requiring `event_id`.
- [ ] Note insert can attach to company/person/opportunity without requiring legacy event data.
- [ ] No Gmail scope changes.

## Suggested next PR

After this PR, the next slice should be one of:

1. Add neutral list pages for People, Companies, and Opportunities.
2. Add Generic Sales Default seeding into the new workflow/config tables.
3. Start migrating `/pipeline` to read `opportunities` instead of legacy `events`.

Recommended next step: neutral list pages first. They make the records created here visible outside the dashboard without touching the heavier call/pipeline shells yet.
