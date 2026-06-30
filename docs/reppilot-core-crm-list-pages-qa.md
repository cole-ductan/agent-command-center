# RepPilot Core CRM list pages QA

This PR adds neutral CRM list pages so records created from the dashboard Quick Add flows can be reviewed outside the dashboard.

## Scope

Adds new pages:

- `/companies`
- `/people`
- `/opportunities`
- `/tasks`

Uses existing page:

- `/notes`

Updates navigation:

- Sidebar now includes Companies, People, Opportunities, and Tasks.
- Dashboard metric cards link to Companies, People, Opportunities, Tasks, and Notes.

## Intentional non-goals

- Does not migrate `/call`.
- Does not migrate `/pipeline`.
- Does not remove legacy tables.
- Does not add edit/delete flows.
- Does not add record detail pages yet.
- Does not change Gmail scopes.
- Does not regenerate Supabase TypeScript types yet.

## Manual QA checklist

### Navigation

- [ ] Sidebar shows Companies, People, Opportunities, and Tasks.
- [ ] Companies nav item opens `/companies`.
- [ ] People nav item opens `/people`.
- [ ] Opportunities nav item opens `/opportunities`.
- [ ] Tasks nav item opens `/tasks`.
- [ ] Existing Notes nav item still opens `/notes`.
- [ ] Dashboard metric cards link to the correct pages.

### Empty states

Use a blank workspace or delete test rows.

- [ ] `/companies` shows a clean empty state when no companies exist.
- [ ] `/people` shows a clean empty state when no people exist.
- [ ] `/opportunities` shows a clean empty state when no opportunities exist.
- [ ] `/tasks` shows a clean empty state when no tasks exist.

### Data visibility

Create records from the dashboard Quick Add flow.

- [ ] Add a Company and confirm it appears on `/companies`.
- [ ] Add a Person linked to a Company and confirm it appears on `/people` with the company name.
- [ ] Add an Opportunity linked to a Company and Person and confirm it appears on `/opportunities`.
- [ ] Add a Task linked to a Company, Person, and Opportunity and confirm it appears on `/tasks` with context pills.
- [ ] Add a Note and confirm the Notes metric links to `/notes`.

### Guardrails

- [ ] `/call` still loads.
- [ ] `/pipeline` still loads.
- [ ] `/follow-ups` still loads.
- [ ] Existing legacy Add Lead flow still works where it already existed.
- [ ] No Gmail scope changes.
- [ ] No legacy tables are deleted or renamed.

## Suggested next PR

After this PR, the cleanest next slice is:

`feature/reppilot-opportunity-detail-page`

Goal:

- Add `/opportunities/$opportunityId` detail page.
- Show company, primary person, tasks, notes, and recent interactions for one opportunity.
- Do not migrate `/pipeline` or `/call` yet.

That gives the new CRM core a real object hub before we move the heavier workflow screens onto it.
