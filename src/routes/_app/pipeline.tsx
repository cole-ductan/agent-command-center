import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { Building2, CalendarDays, DollarSign, KanbanSquare, Loader2, Phone, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/pipeline")({
  component: PipelinePage,
});

type StageKey = "new" | "contacted" | "discovery" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

type StageDefinition = {
  key: StageKey;
  label: string;
  description: string;
};

type Opportunity = {
  id: string;
  company_id: string | null;
  primary_person_id: string | null;
  name: string;
  stage_key: string;
  status: string;
  value_amount: number | null;
  currency: string | null;
  expected_close_date: string | null;
  next_step: string | null;
  updated_at: string;
};

type Company = { id: string; name: string };
type Person = { id: string; full_name: string };

const STAGES: StageDefinition[] = [
  { key: "new", label: "New", description: "Fresh opportunities that need first action." },
  { key: "contacted", label: "Contacted", description: "Initial outreach started." },
  { key: "discovery", label: "Discovery", description: "Needs, pain, and fit are being clarified." },
  { key: "qualified", label: "Qualified", description: "Fit and next step are strong enough to pursue." },
  { key: "proposal", label: "Proposal", description: "Proposal, pricing, or offer is in motion." },
  { key: "negotiation", label: "Negotiation", description: "Working through terms, objections, or final details." },
  { key: "won", label: "Won", description: "Closed successfully." },
  { key: "lost", label: "Lost", description: "Closed unsuccessfully or disqualified." },
];

const STAGE_KEYS = new Set(STAGES.map((stage) => stage.key));

function PipelinePage() {
  const { tenantId } = useActiveTenant();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person.full_name])), [people]);

  const load = useCallback(async () => {
    if (!tenantId) {
      setOpportunities([]);
      setCompanies([]);
      setPeople([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = supabase as unknown as { from: (table: string) => any };
      const [opportunityResult, companyResult, peopleResult] = await Promise.all([
        db
          .from("opportunities")
          .select("id,company_id,primary_person_id,name,stage_key,status,value_amount,currency,expected_close_date,next_step,updated_at")
          .eq("tenant_id", tenantId)
          .order("updated_at", { ascending: false })
          .limit(500),
        db.from("companies").select("id,name").eq("tenant_id", tenantId).order("name", { ascending: true }).limit(500),
        db.from("people").select("id,full_name").eq("tenant_id", tenantId).order("full_name", { ascending: true }).limit(500),
      ]);

      if (opportunityResult.error) throw opportunityResult.error;
      if (companyResult.error) throw companyResult.error;
      if (peopleResult.error) throw peopleResult.error;

      setOpportunities((opportunityResult.data ?? []) as Opportunity[]);
      setCompanies((companyResult.data ?? []) as Company[]);
      setPeople((peopleResult.data ?? []) as Person[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load pipeline.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const normalizedOpportunities = useMemo(
    () => opportunities.map((opportunity) => ({
      ...opportunity,
      stage_key: STAGE_KEYS.has(opportunity.stage_key as StageKey) ? opportunity.stage_key : "new",
    })),
    [opportunities],
  );

  const active = activeId ? normalizedOpportunities.find((opportunity) => opportunity.id === activeId) : null;
  const totalValue = normalizedOpportunities.reduce((sum, opportunity) => sum + (opportunity.value_amount ?? 0), 0);
  const openCount = normalizedOpportunities.filter((opportunity) => opportunity.status === "open").length;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (!event.over || !tenantId) return;

    const id = String(event.active.id);
    const newStage = String(event.over.id) as StageKey;
    const opportunity = opportunities.find((item) => item.id === id);
    if (!opportunity || opportunity.stage_key === newStage) return;

    const nextStatus = newStage === "won" ? "won" : newStage === "lost" ? "lost" : "open";
    setOpportunities((prev) => prev.map((item) => item.id === id ? { ...item, stage_key: newStage, status: nextStatus } : item));

    const db = supabase as unknown as { from: (table: string) => any };
    const { error: updateError } = await db
      .from("opportunities")
      .update({ stage_key: newStage, status: nextStatus })
      .eq("tenant_id", tenantId)
      .eq("id", id);

    if (updateError) {
      toast.error("Pipeline update failed");
      void load();
    } else {
      toast.success(`Moved to ${stageLabel(newStage)}`);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col bg-background">
      <header className="border-b bg-card/95 px-4 py-4 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">RepPilot Core CRM</p>
            <h1 className="font-display text-3xl font-semibold">Pipeline</h1>
            <p className="mt-1 text-sm text-muted-foreground">Drag opportunities across neutral sales stages.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/opportunities">Opportunities</Link></Button>
            <Button asChild><Link to="/start-call"><Plus className="mr-2 h-4 w-4" />New Opportunity</Link></Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Metric label="Open opportunities" value={String(openCount)} />
          <Metric label="Total pipeline value" value={formatCurrency(totalValue, "USD")} />
          <Metric label="Stages" value={String(STAGES.length)} />
        </div>
      </header>

      {loading ? (
        <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading pipeline…</StateMessage>
      ) : error ? (
        <StateMessage tone="error">{error}</StateMessage>
      ) : normalizedOpportunities.length === 0 ? (
        <EmptyState />
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="min-h-0 flex-1 overflow-x-auto">
            <div className="flex h-full min-w-max gap-3 px-4 py-4 md:px-8">
              {STAGES.map((stage) => {
                const items = normalizedOpportunities.filter((opportunity) => opportunity.stage_key === stage.key);
                return (
                  <Column key={stage.key} stage={stage} count={items.length} value={items.reduce((sum, item) => sum + (item.value_amount ?? 0), 0)}>
                    {items.map((opportunity) => (
                      <DraggableCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        companyName={opportunity.company_id ? companyById.get(opportunity.company_id) : null}
                        personName={opportunity.primary_person_id ? personById.get(opportunity.primary_person_id) : null}
                      />
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-md border-2 border-dashed border-border/60 px-2 py-4 text-center text-[11px] text-muted-foreground">
                        Drop here
                      </div>
                    )}
                  </Column>
                );
              })}
            </div>
          </div>
          <DragOverlay>
            {active && (
              <PipelineCard
                opportunity={active}
                companyName={active.company_id ? companyById.get(active.company_id) : null}
                personName={active.primary_person_id ? personById.get(active.primary_person_id) : null}
                dragging
              />
            )}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function Column({ stage, count, value, children }: { stage: StageDefinition; count: number; value: number; children: ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.key });
  return (
    <section ref={setNodeRef} className={`flex h-full w-[290px] shrink-0 flex-col rounded-xl border bg-card shadow-[var(--shadow-card)] ${isOver ? "ring-2 ring-primary" : ""}`}>
      <header className="border-b px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">{stage.label}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{stage.description}</p>
          </div>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{count}</span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Value: <span className="font-mono text-foreground">{formatCurrency(value, "USD")}</span></div>
      </header>
      <div className="min-h-[160px] flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
    </section>
  );
}

function DraggableCard({ opportunity, companyName, personName }: { opportunity: Opportunity; companyName: string | null | undefined; personName: string | null | undefined }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: opportunity.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? "opacity-40" : ""}>
      <PipelineCard opportunity={opportunity} companyName={companyName} personName={personName} />
    </div>
  );
}

function PipelineCard({ opportunity, companyName, personName, dragging = false }: { opportunity: Opportunity; companyName: string | null | undefined; personName: string | null | undefined; dragging?: boolean }) {
  return (
    <article className={`rounded-xl border bg-background p-3 shadow-sm ${dragging ? "shadow-lg" : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <Link to="/opportunity-detail" search={{ opportunityId: opportunity.id }} className="line-clamp-2 font-medium hover:text-primary">
          {opportunity.name}
        </Link>
        <KanbanSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      </div>

      <div className="space-y-1 text-xs text-muted-foreground">
        <MiniLine icon={<Building2 className="h-3.5 w-3.5" />} value={companyName ?? "No company"} />
        <MiniLine icon={<UserRound className="h-3.5 w-3.5" />} value={personName ?? "No person"} />
        {opportunity.expected_close_date && <MiniLine icon={<CalendarDays className="h-3.5 w-3.5" />} value={`Close ${format(new Date(opportunity.expected_close_date), "MMM d")}`} />}
        {typeof opportunity.value_amount === "number" && <MiniLine icon={<DollarSign className="h-3.5 w-3.5" />} value={formatCurrency(opportunity.value_amount, opportunity.currency ?? "USD")} />}
      </div>

      {opportunity.next_step && <div className="mt-3 rounded-md bg-secondary/50 px-2 py-1.5 text-xs text-muted-foreground">Next: {opportunity.next_step}</div>}

      <div className="mt-3 flex gap-2">
        <Button asChild size="sm" variant="outline" className="h-8 flex-1 text-xs">
          <Link to="/opportunity-detail" search={{ opportunityId: opportunity.id }}>View</Link>
        </Button>
        <Button asChild size="sm" className="h-8 flex-1 text-xs">
          <Link to="/live-call" search={{ opportunityId: opportunity.id }}><Phone className="mr-1 h-3.5 w-3.5" />Call</Link>
        </Button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border bg-background/70 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-lg font-semibold">{value}</div>
    </section>
  );
}

function MiniLine({ icon, value }: { icon: ReactNode; value: string }) {
  return <div className="flex min-w-0 items-center gap-1.5">{icon}<span className="truncate">{value}</span></div>;
}

function StateMessage({ children, icon, tone }: { children: ReactNode; icon?: ReactNode; tone?: "error" }) {
  return (
    <div className={`m-6 flex items-center gap-2 rounded-xl border bg-card p-5 text-sm shadow-[var(--shadow-card)] ${tone === "error" ? "text-destructive" : "text-muted-foreground"}`}>
      {icon}
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h2 className="font-display text-2xl font-semibold">No opportunities yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">Create your first opportunity, then use this board to move it through the sales process.</p>
        <Button asChild className="mt-4"><Link to="/start-call"><Plus className="mr-2 h-4 w-4" />New Opportunity</Link></Button>
      </div>
    </div>
  );
}

function stageLabel(stageKey: StageKey) {
  return STAGES.find((stage) => stage.key === stageKey)?.label ?? humanize(stageKey);
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}
