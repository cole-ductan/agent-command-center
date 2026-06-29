import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export type TenantRole = "owner" | "admin" | "member";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  logo_url: string | null;
  brand_color: string | null;
  settings: Record<string, any>;
};

export type Membership = {
  tenant: Tenant;
  role: TenantRole;
};

type Ctx = {
  tenantId: string | null;
  tenant: Tenant | null;
  role: TenantRole | null;
  memberships: Membership[];
  loading: boolean;
  refresh: () => Promise<void>;
  switchTenant: (id: string) => Promise<void>;
};

const TenantContext = createContext<Ctx | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setTenantId(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("active_tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    const { data: rows } = await supabase
      .from("tenant_members")
      .select("role, tenant:tenants(id, slug, name, industry, logo_url, brand_color, settings)")
      .eq("user_id", user.id);

    const ms: Membership[] = (rows ?? [])
      .filter((r: any) => r.tenant)
      .map((r: any) => ({ role: r.role as TenantRole, tenant: r.tenant as Tenant }));
    setMemberships(ms);

    let activeId = profile?.active_tenant_id ?? null;
    if (activeId && !ms.find((m) => m.tenant.id === activeId)) activeId = null;
    if (!activeId && ms.length > 0) {
      activeId = ms[0].tenant.id;
      await supabase.from("profiles").update({ active_tenant_id: activeId }).eq("id", user.id);
    }
    setTenantId(activeId);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  // Redirect to onboarding if signed in with zero tenants — but first honor any
  // pending workspace invite so invited users join the inviting workspace
  // instead of being forced to create a brand-new one of their own.
  useEffect(() => {
    if (loading || authLoading || !user) return;
    if (memberships.length > 0) return;
    if (location.pathname.startsWith("/onboarding")) return;
    if (location.pathname.startsWith("/invite/")) return;
    // Allow account settings without a workspace so users can still manage / delete their account.
    if (location.pathname.startsWith("/settings/account")) return;

    let pendingInvite: string | null = null;
    try {
      pendingInvite = localStorage.getItem("pending_invite_token");
    } catch {}
    if (pendingInvite) {
      navigate({ to: "/invite/$token", params: { token: pendingInvite }, replace: true });
      return;
    }
    navigate({ to: "/onboarding", replace: true });
  }, [loading, authLoading, user, memberships, location.pathname, navigate]);

  const switchTenant = useCallback(
    async (id: string) => {
      if (!user) return;
      await supabase.from("profiles").update({ active_tenant_id: id }).eq("id", user.id);
      setTenantId(id);
    },
    [user],
  );

  const tenant = memberships.find((m) => m.tenant.id === tenantId)?.tenant ?? null;
  const role = memberships.find((m) => m.tenant.id === tenantId)?.role ?? null;

  return (
    <TenantContext.Provider
      value={{ tenantId, tenant, role, memberships, loading, refresh: load, switchTenant }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useActiveTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useActiveTenant must be used inside <TenantProvider>");
  return ctx;
}

/** Throws toast-friendly error if no tenant available. */
export function requireTenantId(tenantId: string | null): string {
  if (!tenantId) throw new Error("No active workspace — finish onboarding first");
  return tenantId;
}

export function TenantGate({ children }: { children: ReactNode }) {
  const { loading, tenantId, memberships } = useActiveTenant();
  const { location } = useRouterState();
  if (location.pathname.startsWith("/onboarding")) return <>{children}</>;
  if (location.pathname.startsWith("/settings/account")) return <>{children}</>;
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading workspace…
      </div>
    );
  }
  if (!tenantId || memberships.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to onboarding…
      </div>
    );
  }
  return <>{children}</>;
}
