# RepPilot blank CRM dashboard QA

This PR adds the first visible UI slice on top of the RepPilot Core CRM schema from PR #8.

## Scope

- Updates the root app dashboard at `src/routes/_app/index.tsx`.
- Reads counts from the neutral CRM tables:
  - `companies`
  - `people`
  - `opportunities`
  - `tasks`
  - `notes`
- Shows a neutral Quick Add foundation for:
  - Company
  - Person
  - Opportunity
  - Task
  - Note
- Shows Today’s Work from existing `tasks`.
- Shows Recent Opportunities from new `opportunities`.
- Shows future setup paths:
  - Clean Slate
  - Generic Sales Default
  - Industry Templates
  - Upload My Workflow

## Intentional non-goals

- Does not add create/edit flows yet.
- Does not migrate `/call` yet.
- Does not migrate `/pipeline` yet.
- Does not remove legacy event/contact/call tables.
- Does not generate or update Supabase TypeScript types yet.
- Does not touch Gmail scopes.

## Review checklist

### Dashboard load

- [ ] Dashboard loads for an authenticated user with an active workspace.
- [ ] Empty workspace shows zero counts without crashing.
- [ ] If PR #8 migration has not been applied, dashboard shows a readable error instead of crashing.
- [ ] Existing navigation still works:
  - Start Call
  - Pipeline
  - Follow-Ups

### Neutral CRM data

- [ ] Creating a `companies` row manually in Supabase increases the Companies count.
- [ ] Creating a `people` row manually in Supabase increases the People count.
- [ ] Creating an `opportunities` row manually in Supabase increases the Opportunities count and appears under Recent Opportunities.
- [ ] Creating a pending `tasks` row manually in Supabase appears in Today’s Work if `next_action_at` is today.
- [ ] Creating a `notes` row manually in Supabase increases the Notes count.

### Copy and product direction

- [ ] Root dashboard no longer says “Today’s Cockpit.”
- [ ] Root dashboard no longer centers the blank workspace around tournament/event language.
- [ ] Quick Add shows Company, Person, Opportunity, Task, and Note.
- [ ] Setup Paths make room for Clean Slate, Generic Sales Default, Industry Templates, and Upload My Workflow.

### Guardrails

- [ ] `/call` still loads as before.
- [ ] `/pipeline` still loads as before.
- [ ] `/follow-ups` still loads as before.
- [ ] No Gmail scope changes.
- [ ] Legacy tables are not deleted or renamed.

## Suggested manual seed snippets

Use real IDs from your workspace:

- `YOUR_TENANT_ID`
- `YOUR_USER_ID`

```sql
insert into public.companies (tenant_id, name, industry)
values ('YOUR_TENANT_ID', 'Acme Logistics', 'Transportation');
```

```sql
insert into public.people (tenant_id, full_name, title, email)
values ('YOUR_TENANT_ID', 'Jordan Lee', 'Operations Director', 'jordan@example.com');
```

```sql
insert into public.opportunities (tenant_id, name, stage_key, status, value_amount)
values ('YOUR_TENANT_ID', 'Acme Dispatch Workflow Rollout', 'discovery', 'open', 12000);
```

```sql
insert into public.tasks (tenant_id, user_id, next_action, next_action_at, priority, status)
values ('YOUR_TENANT_ID', 'YOUR_USER_ID', 'Follow up with Jordan about rollout timeline', now(), 'medium', 'pending');
```
