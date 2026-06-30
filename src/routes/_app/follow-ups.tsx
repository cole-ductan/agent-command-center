import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isSameDay, isToday, startOfDay } from "date-fns";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarPlus,
  Check,
  Clock,
  KanbanSquare,
  Loader2,
  Phone,
  Plus,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { openGCal } from "@/lib/gcal";
import {
  QuickAddCrmDialog,
  type CompanyOption,
  type OpportunityOption,
  type PersonOption,
} from "@/components/QuickAddCrmDialog";

export const Route = createFileRoute("/_app/follow-ups")({
  component: FollowUpsPage,
});

type Task = {
  id: string;
  company_id: string | null;
  person_id: string | null;
  opportunity_id: string | null;
  next_action: string;
  next_action_at: string;
  priority: "low" | "normal" | "high" | "urgent" | null;
  status: "pending" | "done" | "snoozed";
};

type Lookup = { id: string; name: string };
type PersonLookup = { id: string; full_name: string };

function FollowUpsPage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Lookup[]>([]);
  const [people, setPeople] = useState<PersonLookup[]>([]);
  const [opportunities, setOpportunities] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showDone, setShowDone] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person.full_name])), [people]);
  const opportunityById = useMemo(() => new Map(opportunities.map((opportunity) => [opportunity.id, opportunity.name])), [opportunities]);

  const load = useCallback(async () => {
    if (!tenantId) {
      setTasks([]);
      setCompanies([]);
      setPeople([]);
      setOpportunities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const db = supabase as unknown as { from: (table: string) => any };
      const taskQuery = db
        .from("tasks")
        .select("id,company_id,person_id,opportunity_id,next_action,next_action_at,priority,status")
        .eq("tenant_id", tenantId)
        .order("next_action_at", { ascending: true });

      const [taskResult, companyResult, peopleResult, opportunityResult] = await Promise.all([
        showDone ? taskQuery : taskQuery.eq("status", "pending"),
        db.from("companies").select("id,name").eq("tenant_id", tenantId).order("name", { ascending: true }).limit(500),
        db.from("people").select("id,full_name").eq("tenant_id", tenantId).order("full_name", { ascending: true }).limit(500),
        db.from("opportunities").select("id,name").eq("tenant_id", tenantId).order("name", { ascending: true }).limit(500),
      ]);

      if (taskResult.error) throw taskResult.error;
      if (companyResult.error) throw companyResult.error;
      if (peopleResult.error) throw peopleResult.error;
      if (opportunityResult.error) throw opportunityResult.error;

      setTasks((taskResult.data ?? []) as Task[]);
      setCompanies((companyResult.data ?? []) as Lookup[]);
      setPeople((peopleResult.data ?? []) as PersonLookup[]);
      setOpportunities((opportunityResult.data ?? []) as Lookup[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [tenantId, showDone]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const groups = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "pending");
    const now = new Date();
    const overdue = pending.filter((task) => new Date(task.next_action_at) < now);
    const today = pending.filter((task) => {
      const dueAt = new Date(task.next_action_at);
      return dueAt >= now && isToday(dueAt);
    });
    const upcoming = pending.filter((task) => {
      const dueAt = new Date(task.next_action_at);
      return dueAt >= now && !isToday(dueAt);
    });
    const done = tasks.filter((task) => task.status === "done");
    return { overdue, today, upcoming, done };
  }, [tasks]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.status !== "pending") return;
      const key = format(startOfDay(new Date(task.next_action_at)), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDate
    ? tasks.filter((task) => task.status === "pending" && isSameDay(new Date(task.next_action_at), selectedDate))
    : [];

  const companyOptions = companies.map((company) => ({ id: company.id, name: company.name })) as CompanyOption[];
  const peopleOptions = people.map((person) => ({ id: person.id, full_name: person.full_name })) as PersonOption[];
  const opportunityOptions = opportunities.map((opportunity) => ({ id: opportunity.id, name: opportunity.name })) as OpportunityOption[];

  const completeTask = async (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: "done" } : task)));
    const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", id);
    if (error) {
      toast.error("Failed to complete task");
      void load();
    } else {
      toast.success("Marked done");
    }
  };

  const restoreTask = async (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: "pending" } : task)));
    const { error } = await supabase.from("tasks").update({ status: "pending" }).eq("id", id);
    if (error) {
      toast.error("Failed to restore task");
      void load();
    } else {
      toast.success("Task restored");
    }
  };

  const snoozeTask = async (id: string, hours: number) => {
    const newAt = new Date(Date.now() + hours * 3_600_000).toISOString();
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, next_action_at: newAt, status: "pending" } : task)));
    const { error } = await supabase.from("tasks").update({ next_action_at: newAt, status: "pending" }).eq("id", id);
    if (error) {
      toast.error("Failed to snooze task");
      void load();
    } else {
      toast.success(`Snoozed ${hours === 1 ? "+1h" : "+1d"}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">RepPilot Core CRM</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Follow-Ups</h1>
          <p className="mt-1 text-sm text-muted-foreground">Neutral next actions across opportunities, companies, and people.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={showDone ? "default" : "outline"} onClick={() => setShowDone((value) => !value)}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            {showDone ? "Showing done" : "Show done"}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/start-call"><Plus className="mr-1.5 h-4 w-4" />New Opportunity</Link>
          </Button>
          <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />New Task
          </Button>
        </div>
      </header>

      <QuickAddCrmDialog
        open={taskDialogOpen}
        kind="task"
        tenantId={tenantId}
        userId={user?.id}
        companies={companyOptions}
        people={peopleOptions}
        opportunities={opportunityOptions}
        onOpenChange={setTaskDialogOpen}
        onCreated={load}
      />

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6 space-y-6">
          {loading ? (
            <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading follow-ups…</StateMessage>
          ) : (
            <>
              <Group title="Overdue" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} tasks={groups.overdue} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={completeTask} onSnooze={snoozeTask} accent="danger" />
              <Group title="Today" icon={<CalendarClock className="h-4 w-4 text-primary" />} tasks={groups.today} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={completeTask} onSnooze={snoozeTask} />
              <Group title="Upcoming" icon={<Clock className="h-4 w-4 text-muted-foreground" />} tasks={groups.upcoming} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={completeTask} onSnooze={snoozeTask} />
              {showDone && <DoneGroup tasks={groups.done} companyById={companyById} personById={personById} opportunityById={opportunityById} onRestore={restoreTask} />}
            </>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="rounded-xl border bg-card p-3 shadow-[var(--shadow-card)]">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasTasks: Array.from(tasksByDay.keys()).map((key) => new Date(`${key}T12:00:00`)),
                }}
                modifiersClassNames={{
                  hasTasks: "relative font-semibold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
                }}
              />
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">
                  {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Pick a date"}
                </h2>
                <Button size="sm" variant="outline" onClick={() => setTaskDialogOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />New Task
                </Button>
              </div>
              {selectedTasks.length === 0 ? (
                <div className="mt-4 rounded-md bg-secondary/50 px-3 py-6 text-center text-sm text-muted-foreground">
                  Nothing scheduled for this day.
                </div>
              ) : (
                <ul className="mt-4 divide-y">
                  {selectedTasks.map((task) => (
                    <TaskRow key={task.id} task={task} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={completeTask} onSnooze={snoozeTask} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Group({
  title,
  icon,
  tasks,
  companyById,
  personById,
  opportunityById,
  onComplete,
  onSnooze,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  companyById: Map<string, string>;
  personById: Map<string, string>;
  opportunityById: Map<string, string>;
  onComplete: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
  accent?: "danger";
}) {
  return (
    <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-lg font-semibold">{title}</h2>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{tasks.length}</span>
      </header>
      {tasks.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Nothing here.</div>
      ) : (
        <ul className="divide-y">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={onComplete} onSnooze={onSnooze} accent={accent} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DoneGroup({
  tasks,
  companyById,
  personById,
  opportunityById,
  onRestore,
}: {
  tasks: Task[];
  companyById: Map<string, string>;
  personById: Map<string, string>;
  opportunityById: Map<string, string>;
  onRestore: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Done</h2>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{tasks.length}</span>
      </header>
      {tasks.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">No completed tasks in this view.</div>
      ) : (
        <ul className="divide-y">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 px-5 py-3 opacity-70">
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => onRestore(task.id)} aria-label="Restore task">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <TaskSummary task={task} companyById={companyById} personById={personById} opportunityById={opportunityById} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskRow({
  task,
  companyById,
  personById,
  opportunityById,
  onComplete,
  onSnooze,
  accent,
}: {
  task: Task;
  companyById: Map<string, string>;
  personById: Map<string, string>;
  opportunityById: Map<string, string>;
  onComplete: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
  accent?: "danger";
}) {
  const opportunityName = task.opportunity_id ? opportunityById.get(task.opportunity_id) : null;
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:px-5">
      <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => onComplete(task.id)} aria-label="Complete task">
        <Check className="h-3.5 w-3.5" />
      </Button>
      <TaskSummary task={task} companyById={companyById} personById={personById} opportunityById={opportunityById} accent={accent} />
      <div className="flex shrink-0 items-center gap-1">
        {task.opportunity_id && (
          <Button asChild size="sm" variant="default" className="h-8 w-8 p-0" title="Start call">
            <Link to="/live-call" search={{ opportunityId: task.opportunity_id }}><Phone className="h-3.5 w-3.5" /></Link>
          </Button>
        )}
        {task.opportunity_id && (
          <Button asChild size="sm" variant="ghost" className="hidden h-8 px-2 text-xs sm:inline-flex">
            <Link to="/opportunity-detail" search={{ opportunityId: task.opportunity_id }}>
              View
            </Link>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title="Add to Google Calendar"
          onClick={() =>
            openGCal({
              title: `${task.next_action}${opportunityName ? ` — ${opportunityName}` : ""}`,
              details: buildTaskDetails(task, companyById, personById, opportunityById),
              start: new Date(task.next_action_at),
            })
          }
        >
          <CalendarPlus className="h-3.5 w-3.5" />
        </Button>
        <div className="hidden gap-1 sm:flex">
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => onSnooze(task.id, 1)}>+1h</Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => onSnooze(task.id, 24)}>+1d</Button>
        </div>
      </div>
    </li>
  );
}

function TaskSummary({
  task,
  companyById,
  personById,
  opportunityById,
  accent,
}: {
  task: Task;
  companyById: Map<string, string>;
  personById: Map<string, string>;
  opportunityById: Map<string, string>;
  accent?: "danger";
}) {
  const companyName = task.company_id ? companyById.get(task.company_id) : null;
  const personName = task.person_id ? personById.get(task.person_id) : null;
  const opportunityName = task.opportunity_id ? opportunityById.get(task.opportunity_id) : null;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={`font-mono ${accent === "danger" ? "text-destructive" : "text-muted-foreground"}`}>
          {format(new Date(task.next_action_at), "MMM d · h:mm a")}
        </span>
        {task.priority && task.priority !== "normal" && <PriorityBadge priority={task.priority} />}
      </div>
      <div className="mt-0.5 truncate font-medium text-sm">{task.next_action}</div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <MiniLine icon={<KanbanSquare className="h-3.5 w-3.5" />} value={opportunityName ?? "No opportunity"} />
        <MiniLine icon={<Building2 className="h-3.5 w-3.5" />} value={companyName ?? "No company"} />
        <MiniLine icon={<UserRound className="h-3.5 w-3.5" />} value={personName ?? "No person"} />
      </div>
    </div>
  );
}

function MiniLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <span className="flex min-w-0 items-center gap-1">{icon}<span className="truncate">{value}</span></span>;
}

function PriorityBadge({ priority }: { priority: NonNullable<Task["priority"]> }) {
  return (
    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {priority}
    </span>
  );
}

function StateMessage({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
      {icon}
      {children}
    </div>
  );
}

function buildTaskDetails(task: Task, companyById: Map<string, string>, personById: Map<string, string>, opportunityById: Map<string, string>) {
  return [
    task.opportunity_id ? `Opportunity: ${opportunityById.get(task.opportunity_id) ?? task.opportunity_id}` : null,
    task.company_id ? `Company: ${companyById.get(task.company_id) ?? task.company_id}` : null,
    task.person_id ? `Person: ${personById.get(task.person_id) ?? task.person_id}` : null,
  ].filter(Boolean).join("\n");
}
