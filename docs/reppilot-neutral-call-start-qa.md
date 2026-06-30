# RepPilot neutral call start QA

This PR replaces the normal new-call entry with a neutral opportunity-first start flow.

## Scope

- The normal Start Call button should no longer open a golf/tournament form.
- The start form should use Opportunity, Company, Person, Location, Target Date, Estimated Value, Stage, Lead Source, and Notes.
- The current Call Cockpit is still legacy-backed for now.

## Guardrails

- No pipeline migration.
- No full Call Cockpit rewrite.
- No legacy table removal.
- No Gmail scope changes.
