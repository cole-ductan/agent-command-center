-- Add generic point activity values for RepPilot blank workspaces.
-- Legacy Dixon/SurePay values remain for Dixon template data and old logs.

alter type public.point_activity add value if not exists 'qualified_opportunity';
alter type public.point_activity add value if not exists 'decision_maker_connected';
alter type public.point_activity add value if not exists 'discovery_completed';
alter type public.point_activity add value if not exists 'proposal_sent_generic';
alter type public.point_activity add value if not exists 'follow_up_scheduled_generic';
alter type public.point_activity add value if not exists 'closed_won_generic';
alter type public.point_activity add value if not exists 'workflow_custom';
