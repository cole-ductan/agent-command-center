import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Building2, Users, MessageSquareWarning, Layers, FileText, UserCircle } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsLayout,
});

const NAV = [
  { to: "/settings/workspace", label: "Workspace", Icon: Building2 },
  { to: "/settings/members", label: "Members", Icon: Users },
  { to: "/settings/objections", label: "Objections", Icon: MessageSquareWarning },
  { to: "/settings/templates", label: "Templates", Icon: Layers },
  { to: "/settings/training-docs", label: "Training Docs", Icon: FileText },
  { to: "/settings/account", label: "Account", Icon: UserCircle },
];

function SettingsLayout() {
  const { location } = useRouterState();
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[220px_1fr] md:px-8">
      <aside className="space-y-1">
        <h2 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Settings
        </h2>
        {NAV.map(({ to, label, Icon }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                active ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/60"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </aside>
      <main className="min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
