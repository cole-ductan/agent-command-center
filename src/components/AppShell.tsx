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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
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
      <SidebarProvider>
        <AppShellInner />
      </SidebarProvider>
    </TenantProvider>
  );
}

const NAV = [
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

function AppSidebar({ onOnboarding }: { onOnboarding: boolean }) {
  const { tenant, memberships, switchTenant } = useActiveTenant();
  const navigate = useNavigate();
  const { location } = useRouterState();

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  const tenantName = tenant?.name ?? "Workspace";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-sidebar-accent transition-colors text-left">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary-foreground shadow-[var(--shadow-fairway)] overflow-hidden"
                style={{
                  background: tenant?.brand_color ? tenant.brand_color : "var(--gradient-fairway)",
                }}
              >
                {tenant?.logo_url ? (
                  <img src={tenant.logo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Flag className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                <div className="font-display text-sm font-semibold truncate">{tenantName}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Command Center
                </div>
              </div>
              <ChevronsUpDown
                className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden"
                aria-hidden="true"
              />
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
      </SidebarHeader>

      {!onOnboarding && (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV.map(({ to, label, Icon, exact }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={isActive(to, exact)} tooltip={label}>
                      <Link to={to}>
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      )}

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" isActive={location.pathname.startsWith("/settings")}>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AppShellInner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { setOpen: setNotesOpen, setView: setNotesView } = useNotesUi();
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  const onOnboarding = location.pathname.startsWith("/onboarding");

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <AppSidebar onOnboarding={onOnboarding} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur">
          <SidebarTrigger />

          <div className="flex-1" />

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
                <AddLeadDialog trigger={null} open={addLeadOpen} onOpenChange={setAddLeadOpen} />
                <Button asChild size="sm" variant="default">
                  <Link to="/call" search={{ new: "1" } as any}>
                    <Phone className="mr-1 h-3.5 w-3.5" />Call
                  </Link>
                </Button>
                <GoogleConnectButton />
              </>
            )}
            <div className="hidden md:flex items-center gap-2 border-l pl-2 ml-1">
              <span className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</span>
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
    </div>
  );
}
