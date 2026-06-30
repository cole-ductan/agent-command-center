import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2, CalendarDays, KanbanSquare, Loader2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/opportunities")({
  component: OpportunitiesPage,
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
  expected_close_date: string | null;
  next_step: string | null;
  updated_at: string;
};

type Company = { id: string; name: string };
type Person = { id: string; full_name: string };

function OpportunitiesPage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);
  const personById = useMemo(() => new Map(people.map((person) => [person.id, person.full_name])), [people]);

  const load = async () => {
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
          .limit(250),
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
      setError(e instanceof Error ? e.message : "Unable to load opportunities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tenantId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">RepPilot Core CRM</p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Opportunities</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sales opportunities connected to companies, people, tasks, and notes.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </header>

      {loading ? (
        <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading opportunities…</StateMessage>
      ) : error ? (
        <StateMessage tone="error">{error}</StateMessage>
      ) : opportunities.length === 0 ? (
        <EmptyState title="No opportunities yet" body="Use Quick Add on the dashboard to create your first opportunity." />
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <article key={opportunity.id} className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-secondary p-2 text-primary">
                      <KanbanSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-lg font-semibold">{opportunity.name}</h2>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge>{humanize(opportunity.stage_key)}</Badge>
                        <span>{humanize(opportunity.status)}</span>
                        <span>Updated {format(new Date(opportunity.updated_at), "MMM d")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                    <MiniLine icon={<Building2 className="h-3.5 w-3.5" />} value={opportunity.company_id ? companyById.get(opportunity.company_id) ?? "Linked company" : "No company"} />
                    <MiniLine icon={<UserRound className="h-3.5 w-3.5" />} value={opportunity.primary_person_id ? personById.get(opportunity.primary_person_id) ?? "Linked person" : "No primary person"} />
                    <MiniLine icon={<CalendarDays className="h-3.5 w-3.5" />} value={opportunity.expected_close_date ? `Close ${format(new Date(opportunity.expected_close_date), "MMM d, yyyy")}` : "No close date"} />
                  </div>

                  {opportunity.next_step && <p className="mt-4 rounded-md bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">Next step: {opportunity.next_step}</p>}
                </div>

                {typeof opportunity.value_amount === "number" && (
                  <div className="rounded-lg bg-secondary px-3 py-2 font-mono text-sm font-semibold">
                    {formatCurrency(opportunity.value_amount, opportunity.currency ?? "USD")}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {icon}
      <span className="truncate">{value}</span>
    </div>
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

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
