# Neutral live call shell QA

This PR adds the first neutral RepPilot live call shell backed by opportunities.

## Scope

- Adds `/live-call?opportunityId=...`.
- Keeps the old `/call?eventId=...` cockpit available for legacy/Dixon-style records.
- Updates `/start-call` so new RepPilot calls open `/live-call` instead of the legacy cockpit.
- Uses generic call steps: Pre-call, Intro, Discovery, Qualify, Value positioning, Objections, Close, Wrap.
- Logs calls to `interactions` with `interaction_type = 'call'`.
- Updates the opportunity description and next step when the call is logged.

## Manual QA

- [ ] Open `/start-call`.
- [ ] Create an opportunity with company and contact.
- [ ] Confirm save redirects to `/live-call?opportunityId=...`.
- [ ] Confirm the live call shell shows Company, Contact, Stage, step rail, script panel, capture checklist, outcome, and notes.
- [ ] Move through the call steps.
- [ ] Add notes and outcome.
- [ ] Click Log Call.
- [ ] Confirm an `interactions` row is created for the opportunity.
- [ ] Confirm the opportunity remains visible on `/opportunities`.
- [ ] Confirm `/call?eventId=...` still opens the legacy cockpit for existing records.

## Not included

- No full workflow config loader yet.
- No custom capture fields yet.
- No objections/resources drawer yet.
- No pipeline migration.
- No legacy table removal.
- No Gmail changes.
