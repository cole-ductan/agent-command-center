import { addDays, startOfDay, format } from "date-fns";

/**
 * Generic weekly planning helpers.
 *
 * The legacy Dixon/SurePay view used a Friday to Thursday reset. Blank RepPilot
 * workspaces now use Monday to Sunday by default. Template-specific week starts
 * can be introduced when the workflow config layer is database-driven.
 */
export function weekStartMonday(d: Date = new Date()): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const back = (day + 6) % 7;
  return startOfDay(addDays(d, -back));
}

export function weekEndSunday(d: Date = new Date()): Date {
  return addDays(weekStartMonday(d), 6);
}

// Backward-compatible aliases used by existing routes during the config migration.
export const weekStartFriday = weekStartMonday;
export const weekEndThursday = weekEndSunday;

export const fmtWeekKey = (d: Date) => format(d, "yyyy-MM-dd");

/** Last N week-start dates, newest first. */
export function lastNWeekStarts(n: number, from: Date = new Date()): Date[] {
  const start = weekStartMonday(from);
  return Array.from({ length: n }, (_, i) => addDays(start, -7 * i));
}

export const POINT_ACTIVITIES: { value: string; label: string; points: number }[] = [
  { value: "qualified_opportunity", label: "Qualified opportunity", points: 2 },
  { value: "decision_maker_connected", label: "Decision maker connected", points: 1 },
  { value: "discovery_completed", label: "Discovery completed", points: 1 },
  { value: "proposal_sent_generic", label: "Proposal or recommendation sent", points: 2 },
  { value: "follow_up_scheduled_generic", label: "Follow-up scheduled", points: 1 },
  { value: "closed_won_generic", label: "Closed won", points: 3 },
  { value: "workflow_custom", label: "Custom workspace activity", points: 1 },
];

export const POINTS_TARGET = 10;
export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Returns hours between two HH:MM strings on the same day, or 0. */
export function shiftHours(start?: string | null, end?: string | null): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : 0;
}
