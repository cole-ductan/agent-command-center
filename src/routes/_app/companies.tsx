import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Building2, Globe, Loader2, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/companies")({
  component: CompaniesPage,
});

type Company = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  phone: string | null;
  industry: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function CompaniesPage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!tenantId) {
      setCompanies([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = supabase as unknown as { from: (table: string) => any };
      const { data, error: loadError } = await db
        .from("companies")
        .select("id,name,domain,website,phone,industry,status,created_at,updated_at")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false })
        .limit(250);

      if (loadError) throw loadError;
      setCompanies((data ?? []) as Company[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load companies.");
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
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Companies</h1>
          <p className="mt-1 text-sm text-muted-foreground">Accounts and organizations attached to your sales opportunities.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </header>

      {loading ? (
        <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading companies…</StateMessage>
      ) : error ? (
        <StateMessage tone="error">{error}</StateMessage>
      ) : companies.length === 0 ? (
        <EmptyState title="No companies yet" body="Use Quick Add on the dashboard to create your first company." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {companies.map((company) => (
            <article key={company.id} className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg bg-secondary p-2 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-semibold">{company.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {format(new Date(company.updated_at), "MMM d, yyyy")}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                {company.industry && <Field label="Industry" value={company.industry} />}
                <Field label="Status" value={humanize(company.status)} />
                {company.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {(company.website || company.domain) && (
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{company.website ?? company.domain}</span>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
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
