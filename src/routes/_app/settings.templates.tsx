import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/templates")({
  component: TemplatesPage,
});

type Template = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  industry: string | null;
};

function TemplatesPage() {
  const { tenant, role } = useActiveTenant();
  const canEdit = role === "owner" || role === "admin";
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("command_center_templates")
        .select("id, slug, name, description, industry")
        .order("name");
      setTemplates((data ?? []) as Template[]);
      setLoading(false);
    })();
  }, []);

  const apply = async (t: Template) => {
    if (!canEdit) return;
    if (!tenant) return;
    if (
      !confirm(
        `Apply "${t.name}" to ${tenant.name}? Existing items with the same slug will be skipped.`,
      )
    )
      return;
    setApplying(t.id);
    try {
      const { data, error } = await supabase.rpc("apply_template", {
        p_tenant_id: tenant.id,
        p_template_id: t.id,
      });
      if (error) throw error;
      const counts = data as Record<string, number>;
      toast.success(
        `Applied "${t.name}" — added ${counts?.offers ?? 0} offers, ${counts?.email_templates ?? 0} emails, ${counts?.script_sections ?? 0} script steps, ${counts?.objections ?? 0} objections`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to apply template");
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Starter templates</h1>
        <p className="text-sm text-muted-foreground">
          Pre-built bundles of offers, scripts, emails, and objections you can drop into your workspace.
          Existing items with matching slugs are kept — applying is non-destructive.
        </p>
      </header>

      {!canEdit && (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Read-only view. Members can see available starter templates, but only Admins and Owners can apply templates to this workspace.</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> {t.name}
                </CardTitle>
                {t.industry && <CardDescription>{t.industry}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                {t.description && (
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                )}
                {canEdit ? (
                  <Button
                    onClick={() => apply(t)}
                    disabled={applying !== null || t.slug === "blank"}
                    size="sm"
                    variant={t.slug === "blank" ? "outline" : "default"}
                  >
                    {applying === t.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.slug === "blank" ? "Nothing to apply" : "Apply to this workspace"}
                  </Button>
                ) : (
                  <div className="rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                    Template application is restricted to Admins and Owners.
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}