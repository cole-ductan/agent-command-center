import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CalendarRange, Target, Clock, Trophy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  weekStartMonday,
  weekEndSunday,
  fmtWeekKey,
  POINT_ACTIVITIES,
  POINTS_TARGET,
  DAYS_OF_WEEK,
  shiftHours,
} from "@/lib/week";

export const Route = createFileRoute("/_app/my-week")({
  component: MyWeekPage,
});

type ScheduleRow = {
  id?: string;
  day_of_week: number;
  shift1_start: string | null;
  shift1_end: string | null;
  shift2_start: string | null;
  shift2_end: string | null;
};

type PointLog = {
  id: string;
  log_date: string;
  activity: string;
  points: number;
  notes: string | null;
};

const emptyDay = (d: number): ScheduleRow => ({
  day_of_week: d,
  shift1_start: null,
  shift1_end: null,
  shift2_start: null,
  shift2_end: null,
});

function MyWeekPage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const weekStart = useMemo(() => weekStartMonday(), []);
  const weekEnd = useMemo(() => weekEndSunday(), []);
  const weekKey = fmtWeekKey(weekStart);

  const [schedule, setSchedule] = useState<ScheduleRow[]>(Array.from({ length: 7 }, (_, i) => emptyDay(i)));
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [newActivity, setNewActivity] = useState<string>("");
  const [newNotes, setNewNotes] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [goal, setGoal] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    if (!tenantId) {
      setSchedule(Array.from({ length: 7 }, (_, i) => emptyDay(i)));
      setLogs([]);
      setGoal("");
      setLoading(false);
      return;
    }

    setLoading(true);
    const [sched, log, goalRow] = await Promise.all([
      supabase
        .from("cm_schedules")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .eq("week_start", weekKey),
      supabase
        .from("point_logs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .gte("log_date", weekKey)
        .lte("log_date", fmtWeekKey(weekEnd))
        .order("log_date", { ascending: false }),
      supabase
        .from("weekly_goals")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", user.id)
        .eq("week_start", weekKey)
        .maybeSingle(),
    ]);

    const next = Array.from({ length: 7 }, (_, i) => emptyDay(i));
    (sched.data ?? []).forEach((row: any) => {
      next[row.day_of_week] = {
        id: row.id,
        day_of_week: row.day_of_week,
        shift1_start: row.shift1_start,
        shift1_end: row.shift1_end,
        shift2_start: row.shift2_start,
        shift2_end: row.shift2_end,
      };
    });

    setSchedule(next);
    setLogs((log.data ?? []) as PointLog[]);
    setGoal(goalRow.data?.goal != null ? String(goalRow.data.goal) : "");
    setLoading(false);
  }, [user, tenantId, weekKey, weekEnd]);

  useEffect(() => { load(); }, [load]);

  const totalHours = useMemo(
    () => schedule.reduce((sum, d) => sum + shiftHours(d.shift1_start, d.shift1_end) + shiftHours(d.shift2_start, d.shift2_end), 0),
    [schedule],
  );

  const totalPoints = useMemo(() => logs.reduce((s, l) => s + (l.points || 0), 0), [logs]);
  const progress = Math.min(100, Math.round((totalPoints / POINTS_TARGET) * 100));
  const targetHit = totalPoints >= POINTS_TARGET;

  const updateCell = (dayIdx: number, field: keyof ScheduleRow, value: string) => {
    setSchedule((prev) => prev.map((r, i) => i === dayIdx ? { ...r, [field]: value || null } : r));
  };

  const saveSchedule = async () => {
    if (!user || !tenantId) return;
    setScheduleSaving(true);
    const rows = schedule.map((r) => ({
      tenant_id: tenantId,
      user_id: user.id,
      week_start: weekKey,
      day_of_week: r.day_of_week,
      shift1_start: r.shift1_start,
      shift1_end: r.shift1_end,
      shift2_start: r.shift2_start,
      shift2_end: r.shift2_end,
    }));

    const { error } = await supabase
      .from("cm_schedules")
      .upsert(rows, { onConflict: "user_id,week_start,day_of_week" });

    setScheduleSaving(false);
    if (error) toast.error("Save failed: " + error.message);
    else toast.success("Weekly schedule saved");
  };

  const addLog = async () => {
    if (!user || !tenantId || !newActivity) {
      toast.error("Pick an activity");
      return;
    }

    const def = POINT_ACTIVITIES.find((a) => a.value === newActivity);
    if (!def) return;

    const { error } = await supabase.from("point_logs").insert({
      tenant_id: tenantId,
      user_id: user.id,
      log_date: newDate,
      activity: newActivity as any,
      points: def.points,
      notes: newNotes.trim() || null,
    });

    if (error) toast.error("Save failed: " + error.message);
    else {
      toast.success(`+${def.points} point${def.points === 1 ? "" : "s"} logged`);
      setNewActivity("");
      setNewNotes("");
      load();
    }
  };

  const removeLog = async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    const { error } = await supabase.from("point_logs").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); load(); }
  };

  const saveGoal = async () => {
    if (!user || !tenantId) return;
    const g = goal.trim() === "" ? 0 : Number(goal);
    if (Number.isNaN(g) || g < 0) {
      toast.error("Goal must be a positive number");
      return;
    }

    const { error } = await supabase
      .from("weekly_goals")
      .upsert({ tenant_id: tenantId, user_id: user.id, week_start: weekKey, goal: g }, { onConflict: "user_id,week_start" });

    if (error) toast.error("Save failed: " + error.message);
    else toast.success("Weekly goal saved");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">My Week</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Week of {format(weekStart, "MMM d")} to {format(weekEnd, "MMM d, yyyy")} · resets every Monday
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-secondary/40 px-3 py-1.5 text-xs font-mono">
          <CalendarRange className="h-3.5 w-3.5" />
          {totalHours.toFixed(1)} focus hrs · {totalPoints}/{POINTS_TARGET} pts
        </div>
      </header>

      {loading ? (
        <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Loading weekly plan…</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard icon={<Clock className="h-4 w-4" />} label="Focus hours" value={totalHours.toFixed(1)} />
            <MetricCard icon={<Target className="h-4 w-4" />} label="Activity points" value={`${totalPoints}/${POINTS_TARGET}`} />
            <MetricCard icon={<Trophy className="h-4 w-4" />} label="Weekly target" value={targetHit ? "Hit" : `${POINTS_TARGET - totalPoints} left`} />
          </section>

          <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
            <header className="flex items-center justify-between border-b px-5 py-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Focus Schedule</h2>
                <p className="text-xs text-muted-foreground">Plan the weekly blocks you want dedicated to selling, follow-up, or client work.</p>
              </div>
              <Button size="sm" onClick={saveSchedule} disabled={scheduleSaving}>
                {scheduleSaving ? "Saving…" : "Save Schedule"}
              </Button>
            </header>

            <div className="hidden md:block overflow-x-auto p-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 text-left font-semibold">Day</th>
                    <th className="px-2 py-2 text-left font-semibold">Block 1 Start</th>
                    <th className="px-2 py-2 text-left font-semibold">Block 1 End</th>
                    <th className="px-2 py-2 text-left font-semibold">Block 2 Start</th>
                    <th className="px-2 py-2 text-left font-semibold">Block 2 End</th>
                    <th className="px-2 py-2 text-right font-semibold">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {DAYS_OF_WEEK.map((label, idx) => {
                    const row = schedule[idx];
                    const hrs = shiftHours(row.shift1_start, row.shift1_end) + shiftHours(row.shift2_start, row.shift2_end);
                    return (
                      <tr key={label}>
                        <td className="px-2 py-2 font-medium">{label}</td>
                        <td className="px-1 py-1.5"><Input type="time" value={row.shift1_start ?? ""} onChange={(e) => updateCell(idx, "shift1_start", e.target.value)} className="h-8" /></td>
                        <td className="px-1 py-1.5"><Input type="time" value={row.shift1_end ?? ""} onChange={(e) => updateCell(idx, "shift1_end", e.target.value)} className="h-8" /></td>
                        <td className="px-1 py-1.5"><Input type="time" value={row.shift2_start ?? ""} onChange={(e) => updateCell(idx, "shift2_start", e.target.value)} className="h-8" /></td>
                        <td className="px-1 py-1.5"><Input type="time" value={row.shift2_end ?? ""} onChange={(e) => updateCell(idx, "shift2_end", e.target.value)} className="h-8" /></td>
                        <td className="px-2 py-2 text-right font-mono text-muted-foreground">{hrs > 0 ? hrs.toFixed(1) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y">
              {DAYS_OF_WEEK.map((label, idx) => {
                const row = schedule[idx];
                const hrs = shiftHours(row.shift1_start, row.shift1_end) + shiftHours(row.shift2_start, row.shift2_end);
                return (
                  <div key={label} className="px-3 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs font-mono text-muted-foreground">{hrs > 0 ? `${hrs.toFixed(1)} hrs` : "—"}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <TimeField label="Block 1 start" value={row.shift1_start} onChange={(v) => updateCell(idx, "shift1_start", v)} />
                      <TimeField label="Block 1 end" value={row.shift1_end} onChange={(v) => updateCell(idx, "shift1_end", v)} />
                      <TimeField label="Block 2 start" value={row.shift2_start} onChange={(v) => updateCell(idx, "shift2_start", v)} />
                      <TimeField label="Block 2 end" value={row.shift2_end} onChange={(v) => updateCell(idx, "shift2_end", v)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
            <header className="border-b px-5 py-3">
              <h2 className="font-display text-lg font-semibold">Activity Scorecard</h2>
              <p className="text-xs text-muted-foreground">Track the sales actions this workspace cares about. These defaults will become editable in the workflow settings merge.</p>
            </header>

            <div className="grid gap-3 border-b bg-secondary/20 p-4 md:grid-cols-[140px_1fr_1fr_auto]">
              <div className="grid gap-1">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9" />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Activity</Label>
                <Select value={newActivity} onValueChange={setNewActivity}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pick an activity…" /></SelectTrigger>
                  <SelectContent>
                    {POINT_ACTIVITIES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label} <span className="ml-2 font-mono text-xs text-muted-foreground">+{a.points}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Notes</Label>
                <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="h-9" placeholder="Lead, account, or next step…" />
              </div>
              <div className="flex items-end">
                <Button onClick={addLog} className="h-9 w-full md:w-auto"><Plus className="mr-1.5 h-3.5 w-3.5" />Log Activity</Button>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">No activity logged this week.</div>
            ) : (
              <ul className="divide-y">
                {logs.map((l) => {
                  const def = POINT_ACTIVITIES.find((a) => a.value === l.activity);
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-20 shrink-0 text-xs font-mono text-muted-foreground">
                        {format(new Date(l.log_date + "T12:00:00"), "EEE MMM d")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{def?.label ?? l.activity}</div>
                        {l.notes && <div className="truncate text-xs text-muted-foreground">{l.notes}</div>}
                      </div>
                      <div className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-mono text-xs">+{l.points}</div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLog(l.id)} aria-label="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="space-y-2 border-t px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Weekly activity progress</span>
                <span className="font-mono">{totalPoints} / {POINTS_TARGET}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <header className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Weekly Goal</h2>
                <p className="text-xs text-muted-foreground">Set the primary result you want to create this week.</p>
              </div>
              <Button size="sm" onClick={saveGoal}>Save Goal</Button>
            </header>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <div className="grid gap-1">
                <Label className="text-xs">Target closed wins</Label>
                <Input type="number" min={0} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="0" />
              </div>
              <div className="rounded-md bg-secondary/40 p-3 text-sm text-muted-foreground">
                This generic goal will become configurable by workspace. Examples: calls made, demos booked, proposals sent, revenue closed, or custom point targets.
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-display text-2xl font-semibold">{value}</div>
    </section>
  );
}

function TimeField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type="time" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm" />
    </div>
  );
}
