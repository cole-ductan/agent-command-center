# Workspace template separation note

During the RepPilot Core CRM migration, several UI changes are intentionally global across all workspaces.

## Current behavior

- New call starts use the neutral `/start-call` flow.
- The current guided Call Cockpit is still legacy-backed.
- The neutral start flow creates RepPilot Core CRM records and a temporary legacy-compatible event so the current guided cockpit can still open.
- Some Dixon/Golf Tournament Fundraising template surfaces may appear reduced or changed while the base app is moved to the neutral RepPilot core.

## Intended future behavior

- Generic Sales and Clean Slate workspaces should use neutral RepPilot Core CRM defaults.
- Golf Tournament Fundraising should become an industry template, not the base product model.
- Template-specific assets such as scripts, flyers, offers, email templates, and training docs should be copied into a workspace when a template is applied.
- Applying a template should copy starter data into the workspace. The workspace should not remain permanently tied to the master template.

## Follow-up work

- Add explicit setup modes: Clean Slate, Generic Sales Default, Industry Template, Upload My Workflow.
- Add industry template tables and copy-on-apply behavior.
- Move Golf Tournament Fundraising assets into a template payload.
- Migrate the Call Cockpit from legacy events to opportunities/workflow configs.
