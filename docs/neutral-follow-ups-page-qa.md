# Neutral Follow-Ups page QA

This PR converts `/follow-ups` into a neutral RepPilot task command center.

## Scope

- Removes the default dependency on legacy `events` and `AddLeadDialog`.
- Removes legacy buckets: Leads Just Added, Awaiting Response, and No Date Set.
- Shows pending neutral tasks in Overdue, Today, and Upcoming.
- Shows linked Opportunity, Company, and Person names when available.
- Adds New Task using the neutral Quick Add task flow.
- Adds New Opportunity linking to `/start-call`.
- Routes task Call buttons to `/live-call?opportunityId=...` when a task has an opportunity.
- Keeps complete, restore, snooze +1h/+1d, calendar view, and Add to Google Calendar.

## Manual QA

### Main list

- [ ] Open `/follow-ups`.
- [ ] Confirm there is no Add Lead button.
- [ ] Confirm there are New Task and New Opportunity buttons.
- [ ] Confirm legacy buckets are gone.
- [ ] Confirm Overdue, Today, and Upcoming show neutral tasks.
- [ ] Confirm linked opportunity/company/person names show when available.

### Task actions

- [ ] Complete a task and confirm it disappears from pending buckets.
- [ ] Toggle Show done and confirm completed tasks appear.
- [ ] Restore a completed task and confirm it returns to pending.
- [ ] Snooze a task +1h and +1d and confirm dates update.
- [ ] Click task Call and confirm `/live-call?opportunityId=...` opens.
- [ ] Click View and confirm `/opportunity-detail?opportunityId=...` opens.

### Calendar

- [ ] Open the Calendar tab.
- [ ] Confirm dates with pending tasks show indicators.
- [ ] Select a date with tasks and confirm tasks list.
- [ ] Confirm Add to Google Calendar still opens Google Calendar.

## Guardrails

- No pipeline migration.
- No full Tasks page migration.
- No legacy table removal.
- No Gmail changes.
