import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { TenantProvider, useActiveTenant, TenantGate } from "@/hooks/useActiveTenant";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Phone, LayoutDashboard, KanbanSquare, CalendarClock, BookOpen, LogOut, Flag,
  CalendarRange, Package, Loader2, FileText, StickyNote, Mail, Plus, UserPlus,
  CalendarPlus, Users, Building2, Settings, Check, ChevronsUpDown,
} from "lucide-react";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { PendingEmailTray } from "@/components/PendingEmailTray";
import { NotesTray } from "@/components/NotesTray";
import { GoogleConnectButton } from "@/components/GoogleConnectButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useNotesUi } from "@/lib/notesStore";
import { openGCal } from "@/lib/gcal";

export function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <TenantProvider>
      <AppShellInner />
    </TenantProvider>
  );
}

function AppShellInner() {
  const { user } = useAuth();
  const { tenant, memberships, switchTenant } = useActiveTenant();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { setOpen: setNotesOpen, setView: setNotesView } = useNotesUi();
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  const nav = [
    { to: "/", label: "Dashboard", Icon: LayoutDashboard, exact: true },
    { to: "/call", label: "Live Call", Icon: Phone },
    { to: "/pipeline", label: "Pipeline", Icon: KanbanSquare },
    { to: "/follow-ups", label: "Follow-Ups", Icon: CalendarClock },
    { to: "/inbox", label: "Inbox", Icon: Mail },
    { to: "/calendar", label: "Calendar", Icon: CalendarRange },
    { to: "/my-week", label: "My Week", Icon: CalendarRange },
    { to: "/playbook", label: "Playbook", Icon: BookOpen },
    { to: "/offers", label: "Offers & Products", Icon: Package },
    { to: "/flyers", label: "PDF Flyers", Icon: FileText },
    { to: "/notes", label: "Notes", Icon: StickyNote },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const tenantName = tenant?.name ?? "Workspace";
  const onOnboarding = location.pathname.startsWith("/onboarding");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-4 px-4 py-2">
          {/* Brand + tenant switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 shrink-0 rounded-md px-1.5 py-1 hover:bg-secondary/60 transition-colors">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground shadow-[var(--shadow-fairway)] overflow-hidden"
                  style={{
                    background: tenant?.brand_color
                      ? tenant.brand_color
                      : "var(--gradient-fairway)",
                  }}
                >
                  {tenant?.logo_url ? (
                    <img src={tenant.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Flag className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="hidden sm:block leading-tight text-left">
                  <div className="font-display text-sm font-semibold truncate max-w-[140px]">
                    {tenantName}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Command Center
                  </div>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs">Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {memberships.map((m) => (
                <DropdownMenuItem key={m.tenant.id} onSelect={() => switchTenant(m.tenant.id)}>
                  <Building2 className="h-4 w-4" />
                  <span className="flex-1 truncate">{m.tenant.name}</span>
                  {tenant?.id === m.tenant.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate({ to: "/onboarding" })}>
                <Plus className="h-4 w-4" /> New workspace
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                <Settings className="h-4 w-4" /> Workspace settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Nav links — hidden on onboarding */}
          {!onOnboarding && (
            <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
              {nav.map(({ to, label, Icon, exact }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive(to, exact)
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              ))}
            </nav>
          )}
          {onOnboarding && <div className="flex-1" />}

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            {!onOnboarding && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" aria-label="Quick add">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs">Quick add</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAddLeadOpen(true); }}>
                      <UserPlus className="h-4 w-4" /> Add Lead
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setAddLeadOpen(true); }}>
                      <CalendarPlus className="h-4 w-4" /> Add Event
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        openGCal({ title: "Meeting", start: new Date() });
                      }}
                    >
                      <Users className="h-4 w-4" /> Add Meeting
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setNotesView("compose");
                        setNotesOpen(true);
                      }}
                    >
                      <StickyNote className="h-4 w-4" /> Reminder / Note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AddLeadDialog
                  trigger={null}
                  open={addLeadOpen}
                  onOpenChange={setAddLeadOpen}
                />
                <Button asChild size="sm" variant="default">
                  <Link to="/call" search={{ new: "1" } as any}><Phone className="mr-1 h-3.5 w-3.5" />Call</Link>
                </Button>
                <GoogleConnectButton />
              </>
            )}
            <div className="hidden md:flex items-center gap-2 border-l pl-2 ml-1">
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">{user?.email}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth", replace: true });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-w-0">
        <TenantGate>
          <Outlet />
        </TenantGate>
      </main>

      {!onOnboarding && (
        <>
          <PendingEmailTray />
          <NotesTray />
        </>
      )}
    </div>
  );
}
