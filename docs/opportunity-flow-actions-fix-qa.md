# Opportunity flow action fixes QA

This PR fixes the next set of usability issues in the neutral RepPilot opportunity flow.

## Scope

- Adds a New Opportunity button on `/opportunities`.
- Adds a flat, query-based opportunity detail route: `/opportunity-detail?opportunityId=...`.
- Updates opportunity View links to use the flat detail route.
- Adds Save Opportunity to `/start-call` so users can create an opportunity without immediately entering call guidance.
- Keeps Save & Start Call for users who are ready to enter `/live-call` immediately.

## Manual QA

### Opportunities page

- [ ] Open `/opportunities`.
- [ ] Confirm New Opportunity appears in the header.
- [ ] Click New Opportunity and confirm `/start-call` opens.
- [ ] Click View on an opportunity and confirm `/opportunity-detail?opportunityId=...` opens.
- [ ] Click Call on an opportunity and confirm `/live-call?opportunityId=...` opens.

### Start call page

- [ ] Fill out the new opportunity form.
- [ ] Click Save Opportunity.
- [ ] Confirm it saves and opens `/opportunity-detail?opportunityId=...`.
- [ ] Create another opportunity.
- [ ] Click Save & Start Call.
- [ ] Confirm it opens `/live-call?opportunityId=...`.

## Guardrails

- No pipeline migration.
- No full edit/delete flows.
- No legacy table removal.
- No Gmail changes.
