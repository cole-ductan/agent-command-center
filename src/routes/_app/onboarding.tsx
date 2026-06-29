import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/onboarding")({
  component: OnboardingPage,
});

type TemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  industry: string | null;
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "workspace";
}

function OnboardingPage() {
  const { user } = useAuth();
  const { refresh, memberships, switchTenant } = useActiveTenant();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("command_center_templates")
        .select("id, slug, name, description, industry")
        .order("slug");
      const rows = (data ?? []) as TemplateRow[];
      setTemplates(rows);
      const blank = rows.find((r) => r.slug === "blank");
      if (blank) setSelectedTemplate(blank.id);
    })();
  }, []);

  const create = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Workspace name is required");
      return;
    }
    setCreating(true);
    try {
      const { data: result, error } = await supabase.rpc("create_workspace", {
        p_name: name.trim(),
        p_slug: slugify(name),
        p_industry: industry.trim() || null,
        p_template_id: selectedTemplate,
      });
      if (error) throw error;

      const tenant = (result as any)?.tenant;
      if (!tenant?.id) throw new Error("Workspace was created but no workspace was returned");

      // Apply chosen template (skip if "blank")
      const tpl = templates.find((t) => t.id === selectedTemplate);
      if (tpl && tpl.slug !== "blank") {
        toast.success(`Loaded "${tpl.name}" starter content`);
      }

      await refresh();
      toast.success(`Workspace "${tenant.name}" created`);
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Welcome — let's set up your command center</h1>
        <p className="mt-2 text-muted-foreground">
          A workspace is your company's command center. Each workspace gets its own scripts, offers,
          emails, training docs, and CRM.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create your workspace</CardTitle>
          <CardDescription>You can invite teammates and customize everything once you're in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Workspace name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Sales Team"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="industry">Industry (optional)</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="SaaS sales, real estate, fundraising…"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label>Starter template</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((t) => {
                const active = selectedTemplate === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      active ? "border-primary bg-primary/5" : "hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{t.name}</div>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    {t.description && (
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-3">
                        {t.description}
                      </div>
                    )}
                    {t.industry && (
                      <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t.industry}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              You can apply additional starter templates anytime from <strong>Settings → Templates</strong>.
            </p>
          </div>

          <Button onClick={create} disabled={creating || !selectedTemplate} className="w-full">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create workspace
          </Button>
        </CardContent>
      </Card>

      {memberships.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your existing workspaces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {memberships.map((m) => (
              <div key={m.tenant.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{m.tenant.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await switchTenant(m.tenant.id);
                    navigate({ to: "/" });
                  }}
                >
                  Open
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
