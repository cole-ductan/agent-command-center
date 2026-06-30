import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { Building2, CalendarClock, KanbanSquare, Loader2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

type Task = {
  id: string;
  company_id: string | null;
  person_id: string | null;
  opportunity_id: string | null;
  next_action: string;
  next_action_at: string;
  priority: string;
  status: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person.full_name])), [people]);
  const opportunityById = useMemo(() => new Map(opportunities.map((opportunity) => [opportunity.id, opportunity.name])), [opportunities]);

  const load = async () => {
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
      const [tasksResult, companyResult, peopleResult, opportunityResult] = await Promise.all([
        db
          .from("tasks")
          .select("id,company_id,person_id,opportunity_id,next_action,next_action_at,priority,status,updated_at")
          .eq("tenant_id", tenantId)
          .order("next_action_at", { ascending: true })
          .limit(250),
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
  };

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tenantId]);

  const groups = useMemo(() => {
    const pending = tasks.filter((task) => task.status === "pending");
    const overdue = pending.filter((task) => isPast(new Date(task.next_action_at)) && !isToday(new Date(task.next_action_at)));
    const today = pending.filter((task) => isToday(new Date(task.next_action_at)));
    const upcoming = pending.filter((task) => !isPast(new Date(task.next_action_at)) && !isToday(new Date(task.next_action_at)));
    const done = tasks.filter((task) => task.status !== "pending");
    return { overdue, today, upcoming, done };
  }, [tasks]);

  const contextFor = (task: Task) => [
    task.company_id ? companyById.get(task.company_id) ?? "Linked company" : null,
    task.person_id ? personById.get(task.person_id) ?? "Linked person" : null,
    task.opportunity_id ? opportunityById.get(task.opportunity_id) ?? "Linked opportunity" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">RepPilot Core CRM</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Next actions connected to companies, people, and opportunities.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </header>

      {loading ? (
        <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading tasks…</StateMessage>
      ) : error ? (
        <StateMessage tone="error">{error}</StateMessage>
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks yet" body="Use Quick Add on the dashboard to create your first next action." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <TaskGroup title="Overdue" tasks={groups.overdue} contextFor={contextFor} tone="danger" />
          <TaskGroup title="Today" tasks={groups.today} contextFor={contextFor} />
          <TaskGroup title="Upcoming" tasks={groups.upcoming} contextFor={contextFor} />
          <TaskGroup title="Completed / Snoozed" tasks={groups.done} contextFor={contextFor} />
        </div>
      )}
    </div>
  );
}

function TaskGroup({ title, tasks, contextFor, tone }: { title: string; tasks: Task[]; contextFor: (task: Task) => string[]; tone?: "danger" }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-md bg-secondary/50 px-3 py-4 text-sm text-muted-foreground">Nothing here.</div>
      ) : (
        <ul className="divide-y">
          {tasks.map((task) => {
            const context = contextFor(task);
            return (
              <li key={task.id} className="py-3">
                <div className="flex items-start gap-3">
                  <div className={`rounded-lg bg-secondary p-2 ${tone === "danger" ? "text-destructive" : "text-primary"}`}>
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{task.next_action}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(task.next_action_at), "MMM d · h:mm a")}</span>
                      <Badge>{humanize(task.priority)}</Badge>
                      <span>{humanize(task.status)}</span>
                    </div>
                    {context.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {context.map((item) => (
                          <ContextPill key={item}>{item}</ContextPill>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ContextPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
      <Building2 className="h-3 w-3" />
      <span>{children}</span>
    </span>
  );
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
