import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  Check,
  Clock,
  KanbanSquare,
  Loader2,
  Phone,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  QuickAddCrmDialog,
  type CompanyOption,
  type OpportunityOption,
  type PersonOption,
} from "@/components/QuickAddCrmDialog";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

type TaskStatus = "all" | "pending" | "done" | "snoozed";
type TaskPriority = "all" | "low" | "normal" | "high" | "urgent";

type Task = {
  id: string;
  company_id: string | null;
  person_id: string | null;
  opportunity_id: string | null;
  next_action: string;
  next_action_at: string;
  priority: "low" | "normal" | "high" | "urgent" | null;
  status: "pending" | "done" | "snoozed";
  updated_at: string;
};

type Company = { id: string; name: string };
type Person = { id: string; full_name: string };
type Opportunity = { id: string; name: string };

function TasksPage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority>("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person.full_name])), [people]);
  const opportunityById = useMemo(() => new Map(opportunities.map((opportunity) => [opportunity.id, opportunity.name])), [opportunities]);

  const companyOptions = companies.map((company) => ({ id: company.id, name: company.name })) as CompanyOption[];
  const peopleOptions = people.map((person) => ({ id: person.id, full_name: person.full_name })) as PersonOption[];
  const opportunityOptions = opportunities.map((opportunity) => ({ id: opportunity.id, name: opportunity.name })) as OpportunityOption[];

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
    setError(null);

    try {
      const db = supabase as unknown as { from: (table: string) => any };
      let taskQuery = db
        .from("tasks")
        .select("id,company_id,person_id,opportunity_id,next_action,next_action_at,priority,status,updated_at")
        .eq("tenant_id", tenantId)
        .order("next_action_at", { ascending: true })
        .limit(500);

      if (statusFilter !== "all") taskQuery = taskQuery.eq("status", statusFilter);
      if (priorityFilter !== "all") taskQuery = taskQuery.eq("priority", priorityFilter);

      const [tasksResult, companyResult, peopleResult, opportunityResult] = await Promise.all([
        taskQuery,
        db.from("companies").select("id,name").eq("tenant_id", tenantId).order("name", { ascending: true }).limit(500),
        db.from("people").select("id,full_name").eq("tenant_id", tenantId).order("full_name", { ascending: true }).limit(500),
        db.from("opportunities").select("id,name").eq("tenant_id", tenantId).order("name", { ascending: true }).limit(500),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (companyResult.error) throw companyResult.error;
      if (peopleResult.error) throw peopleResult.error;
      if (opportunityResult.error) throw opportunityResult.error;

      setTasks((tasksResult.data ?? []) as Task[]);
      setCompanies((companyResult.data ?? []) as Company[]);
      setPeople((peopleResult.data ?? []) as Person[]);
      setOpportunities((opportunityResult.data ?? []) as Opportunity[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, statusFilter, priorityFilter]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  const groups = useMemo(() => {
    const now = new Date();
    const pending = tasks.filter((task) => task.status === "pending");
    const overdue = pending.filter((task) => new Date(task.next_action_at) < now);
    const today = pending.filter((task) => {
      const dueAt = new Date(task.next_action_at);
      return dueAt >= now && isToday(dueAt);
    });
    const upcoming = pending.filter((task) => {
      const dueAt = new Date(task.next_action_at);
      return dueAt >= now && !isToday(dueAt);
    });
    const nonPending = tasks.filter((task) => task.status !== "pending");
    return { overdue, today, upcoming, nonPending };
  }, [tasks]);

  const completeTask = async (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: "done" } : task)));
    const { error: updateError } = await supabase.from("tasks").update({ status: "done" }).eq("id", id);
    if (updateError) {
      toast.error("Failed to complete task");
      void load();
    } else {
      toast.success("Task completed");
    }
  };

  const restoreTask = async (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: "pending" } : task)));
    const { error: updateError } = await supabase.from("tasks").update({ status: "pending" }).eq("id", id);
    if (updateError) {
      toast.error("Failed to restore task");
      void load();
    } else {
      toast.success("Task restored");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">RepPilot Core CRM</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Full task database across opportunities, companies, and people.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/follow-ups">Follow-Ups</Link>
          </Button>
          <Button onClick={() => setTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />New Task
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

      <section className="mb-6 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatus)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="snoozed">Snoozed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TaskPriority)}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <div className="rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
            Showing <span className="font-mono text-foreground">{tasks.length}</span> tasks
          </div>
        </div>
      </section>

      {loading ? (
        <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading tasks…</StateMessage>
      ) : error ? (
        <StateMessage tone="error">{error}</StateMessage>
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks match this view" body="Create a task or loosen the filters." onCreate={() => setTaskDialogOpen(true)} />
      ) : (
        <div className="space-y-6">
          <TaskGroup title="Overdue" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} tasks={groups.overdue} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={completeTask} onRestore={restoreTask} tone="danger" />
          <TaskGroup title="Today" icon={<CalendarClock className="h-4 w-4 text-primary" />} tasks={groups.today} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={completeTask} onRestore={restoreTask} />
          <TaskGroup title="Upcoming" icon={<Clock className="h-4 w-4 text-muted-foreground" />} tasks={groups.upcoming} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={completeTask} onRestore={restoreTask} />
          <TaskGroup title="Done / Snoozed" icon={<Check className="h-4 w-4 text-primary" />} tasks={groups.nonPending} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={completeTask} onRestore={restoreTask} muted />
        </div>
      )}
    </div>
  );
}

function TaskGroup({
  title,
  icon,
  tasks,
  companyById,
  personById,
  opportunityById,
  onComplete,
  onRestore,
  tone,
  muted,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  companyById: Map<string, string>;
  personById: Map<string, string>;
  opportunityById: Map<string, string>;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  tone?: "danger";
  muted?: boolean;
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
            <TaskRow key={task.id} task={task} companyById={companyById} personById={personById} opportunityById={opportunityById} onComplete={onComplete} onRestore={onRestore} tone={tone} muted={muted} />
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
  onRestore,
  tone,
  muted,
}: {
  task: Task;
  companyById: Map<string, string>;
  personById: Map<string, string>;
  opportunityById: Map<string, string>;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  tone?: "danger";
  muted?: boolean;
}) {
  const companyName = task.company_id ? companyById.get(task.company_id) : null;
  const personName = task.person_id ? personById.get(task.person_id) : null;
  const opportunityName = task.opportunity_id ? opportunityById.get(task.opportunity_id) : null;
  const isPending = task.status === "pending";

  return (
    <li className={`flex items-center gap-3 px-3 py-3 sm:px-5 ${muted ? "opacity-70" : ""}`}>
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        onClick={() => (isPending ? onComplete(task.id) : onRestore(task.id))}
        aria-label={isPending ? "Complete task" : "Restore task"}
      >
        {isPending ? <Check className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
      </Button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`font-mono ${tone === "danger" ? "text-destructive" : "text-muted-foreground"}`}>
            {format(new Date(task.next_action_at), "MMM d · h:mm a")}
          </span>
          <Badge>{humanize(task.status)}</Badge>
          {task.priority && <Badge>{humanize(task.priority)}</Badge>}
        </div>
        <div className="mt-0.5 truncate font-medium text-sm">{task.next_action}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <MiniLine icon={<KanbanSquare className="h-3.5 w-3.5" />} value={opportunityName ?? "No opportunity"} />
          <MiniLine icon={<Building2 className="h-3.5 w-3.5" />} value={companyName ?? "No company"} />
          <MiniLine icon={<UserRound className="h-3.5 w-3.5" />} value={personName ?? "No person"} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {task.opportunity_id && (
          <Button asChild size="sm" variant="default" className="h-8 w-8 p-0" title="Start call">
            <Link to="/live-call" search={{ opportunityId: task.opportunity_id }}><Phone className="h-3.5 w-3.5" /></Link>
          </Button>
        )}
        {task.opportunity_id && (
          <Button asChild size="sm" variant="outline" className="hidden h-8 px-2 text-xs sm:inline-flex">
            <Link to="/opportunity-detail" search={{ opportunityId: task.opportunity_id }}>View</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

function MiniLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <span className="flex min-w-0 items-center gap-1">{icon}<span className="truncate">{value}</span></span>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">{children}</span>;
}

function StateMessage({ children, icon, tone }: { children: React.ReactNode; icon?: React.ReactNode; tone?: "error" }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border bg-card p-5 text-sm shadow-[var(--shadow-card)] ${tone === "error" ? "text-destructive" : "text-muted-foreground"}`}>
      {icon}
      {children}
    </div>
  );
}

function EmptyState({ title, body, onCreate }: { title: string; body: string; onCreate: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      <Button className="mt-4" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />New Task</Button>
    </div>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
