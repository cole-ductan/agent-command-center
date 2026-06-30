# Start Call existing picker and live call panes QA

This PR improves the neutral Start Call and Live Call flow.

## Scope

- Adds an existing opportunity picker to `/start-call`.
- Lets users open `/live-call?opportunityId=...` directly from `/start-call` without going to `/opportunities` first.
- Keeps the new opportunity creation form on `/start-call`.
- Adds right-side productivity panes to `/live-call`:
  - Script guidance
  - Follow-up email
  - Resources
  - Call outcome
  - Call notes

## Manual QA

### Existing opportunity path

- [ ] Create or confirm at least one open opportunity exists.
- [ ] Open `/start-call`.
- [ ] Confirm the Existing Opportunities panel appears above the new opportunity form.
- [ ] Select an opportunity from the dropdown.
- [ ] Click Open Call Guidance.
- [ ] Confirm `/live-call?opportunityId=...` opens for the selected opportunity.

### New opportunity path

- [ ] Use the lower Start a New Call form.
- [ ] Save a new opportunity.
- [ ] Confirm the app opens `/live-call?opportunityId=...`.

### Live call panes

- [ ] Confirm the right side shows Script guidance.
- [ ] Confirm the right side shows Follow-up email.
- [ ] Confirm Copy email copies subject and body.
- [ ] Confirm the right side shows Resources.
- [ ] Confirm Call outcome and Call notes still save when Log Call is clicked.

## Guardrails

- No full workflow config loader yet.
- No full template asset system yet.
- No pipeline migration.
- No legacy table removal.
- No Gmail changes.
