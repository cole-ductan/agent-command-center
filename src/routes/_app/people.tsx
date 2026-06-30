import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2, Loader2, Mail, Phone, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/people")({
  component: PeoplePage,
});

type Person = {
  id: string;
  company_id: string | null;
  full_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  updated_at: string;
};

type Company = { id: string; name: string };

function PeoplePage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const [people, setPeople] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company.name])), [companies]);

  const load = async () => {
    if (!tenantId) {
      setPeople([]);
      setCompanies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = supabase as unknown as { from: (table: string) => any };
      const [peopleResult, companyResult] = await Promise.all([
        db
          .from("people")
          .select("id,company_id,full_name,title,email,phone,status,updated_at")
          .eq("tenant_id", tenantId)
          .order("updated_at", { ascending: false })
          .limit(250),
        db.from("companies").select("id,name").eq("tenant_id", tenantId).order("name", { ascending: true }).limit(500),
      ]);

      if (peopleResult.error) throw peopleResult.error;
      if (companyResult.error) throw companyResult.error;
      setPeople((peopleResult.data ?? []) as Person[]);
      setCompanies((companyResult.data ?? []) as Company[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load people.");
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
          <h1 className="font-display text-3xl font-semibold md:text-4xl">People</h1>
          <p className="mt-1 text-sm text-muted-foreground">Contacts and stakeholders attached to your sales work.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </header>

      {loading ? (
        <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading people…</StateMessage>
      ) : error ? (
        <StateMessage tone="error">{error}</StateMessage>
      ) : people.length === 0 ? (
        <EmptyState title="No people yet" body="Use Quick Add on the dashboard to add your first contact." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-12 gap-3 border-b bg-secondary/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="col-span-4">Person</div>
            <div className="col-span-3">Company</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-2 text-right">Updated</div>
          </div>
          <ul className="divide-y">
            {people.map((person) => (
              <li key={person.id} className="grid grid-cols-12 gap-3 px-4 py-3 text-sm">
                <div className="col-span-4 flex min-w-0 items-start gap-3">
                  <div className="rounded-lg bg-secondary p-2 text-primary">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{person.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{person.title ?? humanize(person.status)}</div>
                  </div>
                </div>
                <div className="col-span-3 flex min-w-0 items-center gap-2 text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{person.company_id ? companyById.get(person.company_id) ?? "Linked company" : "No company"}</span>
                </div>
                <div className="col-span-3 min-w-0 space-y-1 text-xs text-muted-foreground">
                  {person.email && <MiniLine icon={<Mail className="h-3.5 w-3.5" />} value={person.email} />}
                  {person.phone && <MiniLine icon={<Phone className="h-3.5 w-3.5" />} value={person.phone} />}
                  {!person.email && !person.phone && <span>No contact info</span>}
                </div>
                <div className="col-span-2 text-right text-xs text-muted-foreground">{format(new Date(person.updated_at), "MMM d")}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MiniLine({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {icon}
      <span className="truncate">{value}</span>
    </div>
  );
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
