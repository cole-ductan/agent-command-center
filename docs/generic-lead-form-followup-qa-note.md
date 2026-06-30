# QA note: inline lead form copy

The blank workspace `/call` inline new-lead form still needs generic copy cleanup.

Use this mapping in `src/routes/_app/call.tsx`:

| Current | Replace with |
| --- | --- |
| Event name | Lead name |
| Annual Scholarship Classic | Acme expansion opportunity |
| Golf course | Location / context |
| Pebble Creek GC | Region, branch, deal context... |
| # of Players | Quantity / size |
| Est. player count | Estimated size |
| Event ID | External ID |
| e.g. Dixon tournament ID | CRM, import, or source ID |

`src/components/AddLeadDialog.tsx` has already been updated with generic copy. The inline `/call` form should match it.
