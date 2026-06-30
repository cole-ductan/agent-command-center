# Generic lead form follow-up

PR #3 replaced the default guided workflow and My Week defaults with generic RepPilot language. During QA, the inline new-lead form at `/call` still showed blank-workspace leakage from the Dixon Golf workflow.

## Confirmed remaining inline labels/placeholders

File:

```text
src/routes/_app/call.tsx
```

Inline form copy still includes:

```text
Event name
Annual Scholarship Classic
Golf course
Pebble Creek GC
# of Players
Est. player count
Event ID
e.g. Dixon tournament ID
```

## Desired generic copy

```text
Lead name
Acme expansion opportunity
Location / context
Region, branch, deal context...
Quantity / size
Estimated size
External ID
CRM, import, or source ID
```

## Notes

`src/components/AddLeadDialog.tsx` has already been updated with this generic copy. The inline `/call` form should be updated to match it in the next code pass.
