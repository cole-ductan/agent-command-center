# Neutral Tasks page QA

This PR turns `/tasks` into the full neutral RepPilot task database view.

## Scope

- Keeps `/follow-ups` as the active work queue.
- Makes `/tasks` the broader task database view.
- Adds New Task using the neutral Quick Add task flow.
- Adds status and priority filters.
- Shows Overdue, Today, Upcoming, and Done / Snoozed groups.
- Uses correct overdue logic: anything due before now is Overdue, including earlier today.
- Shows linked Opportunity, Company, and Person names.
- Adds complete and restore actions.
- Adds Call and View actions when a task has an opportunity.

## Manual QA

### Page load and filters

- [ ] Open `/tasks`.
- [ ] Confirm the page says Tasks and describes the full task database.
- [ ] Confirm New Task and Follow-Ups buttons are present.
- [ ] Confirm status filter works for All, Pending, Done, and Snoozed.
- [ ] Confirm priority filter works for All, Low, Normal, High, and Urgent.

### Buckets

- [ ] Confirm earlier-today pending tasks show under Overdue.
- [ ] Confirm later-today pending tasks show under Today.
- [ ] Confirm future-day pending tasks show under Upcoming.
- [ ] Confirm done/snoozed tasks show under Done / Snoozed when included by filters.

### Actions

- [ ] Create a task with New Task.
- [ ] Confirm linked opportunity/company/person context appears when selected.
- [ ] Complete a pending task and confirm it moves out of pending groups.
- [ ] Restore a done task and confirm it returns to pending.
- [ ] Click Call on a task with an opportunity and confirm `/live-call?opportunityId=...` opens.
- [ ] Click View on a task with an opportunity and confirm `/opportunity-detail?opportunityId=...` opens.

## Guardrails

- No pipeline migration.
- No full edit/delete task flow.
- No legacy table removal.
- No Gmail changes.
