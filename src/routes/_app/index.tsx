import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { format, isToday } from "date-fns";
import {
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  KanbanSquare,
  Loader2,
  Phone,
  Plus,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import {
  QuickAddCrmDialog,
  type CompanyOption,
  type OpportunityOption,
  type PersonOption,
  type QuickAddKind,
} from "@/components/QuickAddCrmDialog";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

type CrmCounts = {
  companies: number;
  people: number;
  opportunities: number;
  tasks: number;
  notes: number;
};

type DashboardTask = {
  id: string;
  next_action: string;
  next_action_at: string;
  priority: string | null;
  status: string;
};

type OpportunityLite = {
  id: string;
  name: string;
  stage_key: string;
  status: string;
  value_amount: number | null;
  currency: string | null;
  expected_close_date: string | null;
  updated_at: string;
};

const EMPTY_COUNTS: CrmCounts = {
  companies: 0,
  people: 0,
  opportunities: 0,
  tasks: 0,
  notes: 0,
};

const setupPaths = [
  {
    title: "Clean Slate",
    description: "Start with CRM primitives and build your own sales workflow.",
    icon: Plus,
  },
  {
    title: "Generic Sales Default",
    description: "Load a basic sales operating system for calls, follow-ups, and pipeline work.",
    icon: Sparkles,
  },
  {
    title: "Industry Templates",
    description: "Copy a proven blueprint into the workspace and customize it.",
    icon: ClipboardList,
  },
  {
    title: "Upload My Workflow",
    description: "Extract scripts, SOPs, PDFs, and docs into a reviewable import preview.",
    icon: UploadCloud,
  },
];

function Dashboard() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const [counts, setCounts] = useState<CrmCounts>(EMPTY_COUNTS);
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityLite[]>([]);
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<PersonOption[]>([]);
  const [opportunityOptions, setOpportunityOptions] = useState<OpportunityOption[]>([]);
  const [quickAddKind, setQuickAddKind] = useState<QuickAddKind | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    setTodayLabel(format(new Date(), "EEEE, MMMM d"));
  }, []);

  const load = async () => {
    if (!tenantId) {
      setCounts(EMPTY_COUNTS);
      setTasks([]);
      setOpportunities([]);
      setCompanyOptions([]);
      setPeopleOptions([]);
      setOpportunityOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = supabase as unknown as {
        from: (table: string) => any;
      };

      const countRows = async (table: string) => {
        const { count, error: countError } = await db
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId);

        if (countError) throw countError;
        return count ?? 0;
      };

      const [
        companyCount,
        peopleCount,
        opportunityCount,
        taskCount,
        noteCount,
        taskResult,
        opportunityResult,
        companyOptionResult,
        peopleOptionResult,
        opportunityOptionResult,
      ] = await Promise.all([
        countRows("companies"),
        countRows("people"),
        countRows("opportunities"),
        countRows("tasks"),
        countRows("notes"),
        db
          .from("tasks")
          .select("id,next_action,next_action_at,priority,status")
          .eq("tenant_id", tenantId)
          .eq("status", "pending")
          .order("next_action_at", { ascending: true })
          .limit(12),
        db
          .from("opportunities")
          .select("id,name,stage_key,status,value_amount,currency,expected_close_date,updated_at")
          .eq("tenant_id", tenantId)
          .order("updated_at", { ascending: false })
          .limit(6),
        db.from("companies").select("id,name").eq("tenant_id", tenantId).order("name", { ascending: true }).limit(100),
        db.from("people").select("id,full_name").eq("tenant_id", tenantId).order("full_name", { ascending: true }).limit(100),
        db.from("opportunities").select("id,name").eq("tenant_id", tenantId).order("name", { ascending: true }).limit(100),
      ]);

      if (taskResult.error) throw taskResult.error;
      if (opportunityResult.error) throw opportunityResult.error;
      if (companyOptionResult.error) throw companyOptionResult.error;
      if (peopleOptionResult.error) throw peopleOptionResult.error;
      if (opportunityOptionResult.error) throw opportunityOptionResult.error;

      setCounts({
        companies: companyCount,
        people: peopleCount,
        opportunities: opportunityCount,
        tasks: taskCount,
        notes: noteCount,
      });
      setTasks((taskResult.data ?? []) as DashboardTask[]);
      setOpportunities((opportunityResult.data ?? []) as OpportunityLite[]);
      setCompanyOptions((companyOptionResult.data ?? []) as CompanyOption[]);
      setPeopleOptions((peopleOptionResult.data ?? []) as PersonOption[]);
      setOpportunityOptions((opportunityOptionResult.data ?? []) as OpportunityOption[]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load CRM dashboard data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tenantId]);

  const now = new Date();
  const overdue = tasks.filter((task) => new Date(task.next_action_at) < now);
  const todayItems = tasks.filter((task) => {
    const dueAt = new Date(task.next_action_at);
    return dueAt >= now && isToday(dueAt);
  });
  const upcoming = tasks.filter((task) => {
    const dueAt = new Date(task.next_action_at);
    return dueAt >= now && !isToday(dueAt);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">RepPilot Core CRM</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Workspace Command Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/start-call">
              <Phone className="mr-2 h-4 w-4" />
              Start Call
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pipeline">
              <KanbanSquare className="mr-2 h-4 w-4" />
              Pipeline
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/follow-ups">
              <CalendarClock className="mr-2 h-4 w-4" />
              Follow-Ups
            </Link>
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading CRM foundation…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive shadow-[var(--shadow-card)]">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Companies" value={counts.companies} icon={<Building2 className="h-4 w-4" />} to="/companies" />
            <MetricCard title="People" value={counts.people} icon={<UserRound className="h-4 w-4" />} to="/people" />
            <MetricCard title="Opportunities" value={counts.opportunities} icon={<KanbanSquare className="h-4 w-4" />} to="/opportunities" />
            <MetricCard title="Tasks" value={counts.tasks} icon={<CalendarClock className="h-4 w-4" />} to="/tasks" />
            <MetricCard title="Notes" value={counts.notes} icon={<FileText className="h-4 w-4" />} to="/notes" />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="space-y-6 lg:col-span-2">
              <Card title="Quick Add" eyebrow="Blank CRM primitives">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <QuickAddTile icon={<Building2 className="h-4 w-4" />} title="Company" onClick={() => setQuickAddKind("company")} />
                  <QuickAddTile icon={<UserRound className="h-4 w-4" />} title="Person" onClick={() => setQuickAddKind("person")} />
                  <QuickAddTile icon={<KanbanSquare className="h-4 w-4" />} title="Opportunity" onClick={() => setQuickAddKind("opportunity")} />
                  <QuickAddTile icon={<CalendarClock className="h-4 w-4" />} title="Task" onClick={() => setQuickAddKind("task")} />
                  <QuickAddTile icon={<FileText className="h-4 w-4" />} title="Note" onClick={() => setQuickAddKind("note")} />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Create neutral CRM records without touching legacy event-shaped data.
                </p>
              </Card>

              <Card title="Today’s Work" eyebrow="Next actions" count={tasks.length}>
                <div className="grid gap-4 md:grid-cols-3">
                  <WorkBucket title="Overdue" items={overdue} tone="danger" />
                  <WorkBucket title="Today" items={todayItems} />
                  <WorkBucket title="Upcoming" items={upcoming} />
                </div>
              </Card>

              <Card title="Recent Opportunities" eyebrow="Neutral pipeline records" count={opportunities.length}>
                {opportunities.length === 0 ? (
                  <Empty>No opportunities in the RepPilot Core CRM yet.</Empty>
                ) : (
                  <ul className="divide-y">
                    {opportunities.map((opportunity) => (
                      <li key={opportunity.id} className="py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{opportunity.name}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <Badge>{humanize(opportunity.stage_key)}</Badge>
                              <span>{humanize(opportunity.status)}</span>
                              {opportunity.expected_close_date && (
                                <span>Close {format(new Date(opportunity.expected_close_date), "MMM d")}</span>
                              )}
                            </div>
                          </div>
                          {typeof opportunity.value_amount === "number" && (
                            <div className="shrink-0 font-mono text-sm text-muted-foreground">
                              {formatCurrency(opportunity.value_amount, opportunity.currency ?? "USD")}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <aside className="space-y-6">
              <Card title="Setup Paths" eyebrow="Coming next">
                <div className="space-y-3">
                  {setupPaths.map((path) => {
                    const Icon = path.icon;
                    return (
                      <div key={path.title} className="rounded-lg border bg-background/50 p-3">
                        <div className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4 text-primary" />
                          {path.title}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{path.description}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card title="Migration Status" eyebrow="Architecture">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>The dashboard is now reading and writing the neutral RepPilot Core CRM tables added in PR #8.</p>
                  <p>Legacy call and pipeline screens remain available while their data layer is migrated in later PRs.</p>
                </div>
              </Card>
            </aside>
          </div>
        </div>
      )}

      <QuickAddCrmDialog
        open={quickAddKind !== null}
        kind={quickAddKind}
        tenantId={tenantId}
        userId={user?.id}
        companies={companyOptions}
        people={peopleOptions}
        opportunities={opportunityOptions}
        onOpenChange={(open) => {
          if (!open) setQuickAddKind(null);
        }}
        onCreated={load}
      />
    </div>
  );
}

function MetricCard({ title, value, icon, to }: { title: string; value: number; icon: ReactNode; to?: string }) {
  const content = (
    <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-3 flex items-center justify-between text-muted-foreground">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <div className="font-display text-3xl font-semibold">{value}</div>
    </section>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

function Card({ title, eyebrow, count, children }: { title: string; eyebrow?: string; count?: number; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</div>}
          <h2 className="font-display text-lg font-semibold">{title}</h2>
        </div>
        {typeof count === "number" && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function QuickAddTile({ icon, title, onClick }: { icon: ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border bg-background/50 p-3 text-left transition hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {title}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">Create record</div>
    </button>
  );
}

function WorkBucket({ title, items, tone }: { title: string; items: DashboardTask[]; tone?: "danger" }) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <Empty compact>Nothing here.</Empty>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 4).map((task) => (
            <li key={task.id} className="text-sm">
              <div className={tone === "danger" ? "font-medium text-destructive" : "font-medium"}>{task.next_action}</div>
              <div className="text-xs text-muted-foreground">{format(new Date(task.next_action_at), "MMM d · h:mm a")}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Empty({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={`rounded-md bg-secondary/50 text-sm text-muted-foreground ${compact ? "px-2 py-2" : "px-3 py-4"}`}>{children}</div>;
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-muted-foreground">{children}</span>;
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
