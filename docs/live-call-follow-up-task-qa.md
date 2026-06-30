# Live call follow-up task QA

This PR makes the neutral live call shell create a real next action.

## Scope

- Adds Follow-up task fields to `/live-call`.
- Captures next action and due date/time.
- When Log Call is clicked, creates a `tasks` row tied to the same opportunity, company, and person.
- Updates the opportunity `next_step` from the follow-up action.
- Redirects back to `/opportunity-detail?opportunityId=...` after logging so the interaction and task can be reviewed together.

## Manual QA

- [ ] Open an opportunity in `/live-call?opportunityId=...`.
- [ ] Enter a call outcome.
- [ ] Enter call notes.
- [ ] Enter a follow-up task and due date/time.
- [ ] Click Log Call.
- [ ] Confirm the app opens `/opportunity-detail?opportunityId=...`.
- [ ] Confirm the call appears in the Timeline.
- [ ] Confirm the follow-up appears in the Tasks section.
- [ ] Confirm the opportunity Next step reflects the follow-up action.

## Guardrails

- No pipeline migration.
- No calendar integration yet.
- No edit/delete flows.
- No legacy table removal.
- No Gmail changes.
