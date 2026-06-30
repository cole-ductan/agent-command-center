import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Building2, CalendarClock, FileText, KanbanSquare, Loader2, MessageSquareText, Phone, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/opportunities/$opportunityId")({
  component: OpportunityDetailPage,
});

type Opportunity = {
  id: string;
  company_id: string | null;
  primary_person_id: string | null;
  name: string;
  stage_key: string;
  status: string;
  value_amount: number | null;
  currency: string | null;
  probability: number | null;
  expected_close_date: string | null;
  source: string | null;
  next_step: string | null;
  description: string | null;
  updated_at: string;
  created_at: string;
};

type Company = {
  id: string;
  name: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
};

type Person = {
  id: string;
  full_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
};

type Interaction = {
  id: string;
  interaction_type: string;
  direction: string | null;
  occurred_at: string;
  subject: string | null;
  summary: string | null;
  outcome: string | null;
};

type Task = {
  id: string;
  next_action: string;
  next_action_at: string;
  priority: string | null;
  status: string;
};

type Note = {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
};

function OpportunityDetailPage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const { opportunityId } = Route.useParams();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user || !tenantId) return;
      setLoading(true);
      setError(null);
      try {
        const db = supabase as unknown as { from: (table: string) => any };
        const { data, error: opportunityError } = await db
          .from("opportunities")
          .select("id,company_id,primary_person_id,name,stage_key,status,value_amount,currency,probability,expected_close_date,source,next_step,description,updated_at,created_at")
          .eq("tenant_id", tenantId)
          .eq("id", opportunityId)
          .single();
        if (opportunityError) throw opportunityError;

        const opp = data as Opportunity;
        setOpportunity(opp);

        const [companyResult, personResult, interactionResult, taskResult, noteResult] = await Promise.all([
          opp.company_id
            ? db.from("companies").select("id,name,phone,website,industry").eq("tenant_id", tenantId).eq("id", opp.company_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          opp.primary_person_id
            ? db.from("people").select("id,full_name,title,email,phone").eq("tenant_id", tenantId).eq("id", opp.primary_person_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          db
            .from("interactions")
            .select("id,interaction_type,direction,occurred_at,subject,summary,outcome")
            .eq("tenant_id", tenantId)
            .eq("opportunity_id", opportunityId)
            .order("occurred_at", { ascending: false })
            .limit(50),
          db
            .from("tasks")
            .select("id,next_action,next_action_at,priority,status")
            .eq("tenant_id", tenantId)
            .eq("opportunity_id", opportunityId)
            .order("next_action_at", { ascending: true })
            .limit(25),
          db
            .from("notes")
            .select("id,title,body,created_at")
            .eq("tenant_id", tenantId)
            .eq("opportunity_id", opportunityId)
            .order("created_at", { ascending: false })
            .limit(25),
        ]);

        if (companyResult.error) throw companyResult.error;
        if (personResult.error) throw personResult.error;
        if (interactionResult.error) throw interactionResult.error;
        if (taskResult.error) throw taskResult.error;
        if (noteResult.error) throw noteResult.error;

        setCompany(companyResult.data as Company | null);
        setPerson(personResult.data as Person | null);
        setInteractions((interactionResult.data ?? []) as Interaction[]);
        setTasks((taskResult.data ?? []) as Task[]);
        setNotes((noteResult.data ?? []) as Note[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load opportunity.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user, tenantId, opportunityId]);

  const openTasks = useMemo(() => tasks.filter((task) => task.status === "pending"), [tasks]);

  if (loading) {
    return <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading opportunity…</StateMessage>;
  }

  if (error || !opportunity) {
    return <EmptyState title="Opportunity not found" body={error ?? "This opportunity could not be loaded."} />;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
            <Link to="/opportunities"><ArrowLeft className="mr-1 h-4 w-4" /> Opportunities</Link>
          </Button>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Opportunity</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">{opportunity.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge>{humanize(opportunity.stage_key)}</Badge>
            <span>{humanize(opportunity.status)}</span>
            <span>Updated {format(new Date(opportunity.updated_at), "MMM d, yyyy")}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/live-call" search={{ opportunityId: opportunity.id }}>
              <Phone className="mr-2 h-4 w-4" /> Start Call
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/start-call">Start Another</Link>
          </Button>
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Value" value={typeof opportunity.value_amount === "number" ? formatCurrency(opportunity.value_amount, opportunity.currency ?? "USD") : "No value"} />
        <Metric title="Close date" value={opportunity.expected_close_date ? format(new Date(opportunity.expected_close_date), "MMM d, yyyy") : "No date"} />
        <Metric title="Open tasks" value={String(openTasks.length)} />
        <Metric title="Interactions" value={String(interactions.length)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <Card title="Timeline" eyebrow="Calls and interactions" count={interactions.length}>
            {interactions.length === 0 ? (
              <EmptyText>No calls or interactions logged yet.</EmptyText>
            ) : (
              <div className="space-y-3">
                {interactions.map((interaction) => (
                  <article key={interaction.id} className="rounded-lg border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-medium">
                          <MessageSquareText className="h-4 w-4 text-primary" />
                          {interaction.subject ?? humanize(interaction.interaction_type)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {format(new Date(interaction.occurred_at), "MMM d, yyyy · h:mm a")}
                          {interaction.direction ? ` · ${humanize(interaction.direction)}` : ""}
                        </div>
                      </div>
                      {interaction.outcome && <Badge>{interaction.outcome}</Badge>}
                    </div>
                    {interaction.summary && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{interaction.summary}</p>}
                  </article>
                ))}
              </div>
            )}
          </Card>

          <Card title="Tasks" eyebrow="Next actions" count={tasks.length}>
            {tasks.length === 0 ? (
              <EmptyText>No tasks attached to this opportunity yet.</EmptyText>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-lg border bg-background p-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{task.next_action}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(task.next_action_at), "MMM d · h:mm a")} · {humanize(task.status)}
                        {task.priority ? ` · ${humanize(task.priority)}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Notes" eyebrow="Attached notes" count={notes.length}>
            {notes.length === 0 ? (
              <EmptyText>No notes attached to this opportunity yet.</EmptyText>
            ) : (
              <div className="space-y-2">
                {notes.map((note) => (
                  <article key={note.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center gap-2 font-medium">
                      <FileText className="h-4 w-4 text-primary" />
                      {note.title ?? "Untitled note"}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{note.body}</p>
                    <div className="mt-2 text-xs text-muted-foreground">{format(new Date(note.created_at), "MMM d, yyyy")}</div>
                  </article>
                ))}
              </div>
            )}
          </Card>
        </main>

        <aside className="space-y-6">
          <Card title="Context" eyebrow="Company and person">
            <div className="space-y-4">
              <ContextBlock icon={<Building2 className="h-4 w-4" />} title={company?.name ?? "No company"} lines={[company?.industry, company?.phone, company?.website]} />
              <ContextBlock icon={<UserRound className="h-4 w-4" />} title={person?.full_name ?? "No primary person"} lines={[person?.title, person?.phone, person?.email]} />
            </div>
          </Card>

          <Card title="Opportunity Details" eyebrow="Snapshot">
            <dl className="space-y-3 text-sm">
              <Detail label="Source" value={opportunity.source} />
              <Detail label="Probability" value={opportunity.probability !== null ? `${opportunity.probability}%` : null} />
              <Detail label="Next step" value={opportunity.next_step} />
            </dl>
            {opportunity.description && (
              <div className="mt-4 rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
                <div className="mb-1 font-medium text-foreground">Description</div>
                <p className="whitespace-pre-wrap">{opportunity.description}</p>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
    </section>
  );
}

function Card({ title, eyebrow, count, children }: { title: string; eyebrow?: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          {eyebrow && <div className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</div>}
          <h2 className="font-display text-lg font-semibold">{title}</h2>
        </div>
        {typeof count === "number" && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{count}</span>}
      </div>
      {children}
    </section>
  );
}

function ContextBlock({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: Array<string | null | undefined> }) {
  const cleanLines = lines.filter(Boolean) as string[];
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 font-medium">{icon}{title}</div>
      {cleanLines.length > 0 ? (
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          {cleanLines.map((line) => <div key={line}>{line}</div>)}
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">No extra details yet.</div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "Not set"}</dd>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{children}</span>;
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg bg-secondary/50 px-3 py-4 text-sm text-muted-foreground">{children}</div>;
}

function StateMessage({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <div className="m-6 flex items-center gap-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">{icon}{children}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <Button asChild className="mt-4"><Link to="/opportunities">Back to opportunities</Link></Button>
      </div>
    </div>
  );
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
