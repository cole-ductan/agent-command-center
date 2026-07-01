# Neutral Pipeline board QA

This PR converts `/pipeline` from the legacy event-shaped board into a neutral RepPilot opportunity board.

## Scope

- Reads from `opportunities` instead of legacy `events`.
- Removes default `AddLeadDialog`, legacy stages, and golf/tournament-shaped card fields.
- Groups opportunities by neutral `stage_key`.
- Supports dragging cards between neutral stages.
- Updates `opportunities.stage_key` on drag.
- Updates `opportunities.status` to `won`, `lost`, or `open` based on the destination stage.
- Shows linked company and primary person names when available.
- Shows expected close date, value, and next step.
- Adds View and Call actions on cards.
- Adds New Opportunity action to `/start-call`.

## Manual QA

### Board load

- [ ] Open `/pipeline`.
- [ ] Confirm the board says RepPilot Core CRM.
- [ ] Confirm old Add Lead button is gone.
- [ ] Confirm cards are opportunities, not tournament events.
- [ ] Confirm cards show company/person/value/date/next step when available.

### Drag and stage updates

- [ ] Drag an opportunity from New to Contacted.
- [ ] Refresh and confirm it stays in Contacted.
- [ ] Drag an opportunity to Won and confirm status updates to won.
- [ ] Drag an opportunity to Lost and confirm status updates to lost.
- [ ] Drag it back to an active stage and confirm status returns to open.

### Card actions

- [ ] Click View and confirm `/opportunity-detail?opportunityId=...` opens.
- [ ] Click Call and confirm `/live-call?opportunityId=...` opens.
- [ ] Click New Opportunity and confirm `/start-call` opens.

## Guardrails

- No legacy table deletion.
- No full workflow-config stage loader yet.
- No custom drag sorting inside columns.
- No Gmail changes.
