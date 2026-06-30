# RepPilot neutral call start QA

This PR repairs the neutral opportunity-first start flow from PR #12 so it matches the live RepPilot Core CRM schema.

## Scope

- `/start-call` saves notes/context into `opportunities.description`, not `opportunities.notes`.
- The helper creates the matching `opportunity_people` row when a primary person is created.
- Phone/email now require a contact name so contact details are not silently dropped.
- The start form uses a real submit form so pressing Enter can save.

## Manual QA

- [ ] Open `/start-call`.
- [ ] Try saving without Opportunity name and confirm validation appears.
- [ ] Enter phone or email without Contact name and confirm validation appears.
- [ ] Create an opportunity with Company, Contact name, Phone, Email, Location, Target Date, Estimated Value, and Notes.
- [ ] Confirm the opportunity appears on `/opportunities`.
- [ ] Confirm the notes/location text appears in `opportunities.description`.
- [ ] Confirm a row exists in `opportunity_people` for the new primary person.
- [ ] Confirm the old golf/tournament form is not opened from the normal Call button.

## Guardrails

- No pipeline migration.
- No full Call Cockpit rewrite.
- No legacy table removal.
- No Gmail scope changes.

## SQL check

```sql
select
  o.created_at,
  o.id as opportunity_id,
  o.name as opportunity_name,
  o.next_step,
  o.description,
  c.name as company_name,
  p.full_name as primary_person_name,
  op.person_id as linked_person_id
from public.opportunities o
left join public.companies c
  on c.id = o.company_id
  and c.tenant_id = o.tenant_id
left join public.people p
  on p.id = o.primary_person_id
  and p.tenant_id = o.tenant_id
left join public.opportunity_people op
  on op.opportunity_id = o.id
  and op.person_id = o.primary_person_id
  and op.tenant_id = o.tenant_id
where o.created_at >= now() - interval '7 days'
order by o.created_at desc
limit 25;
```
