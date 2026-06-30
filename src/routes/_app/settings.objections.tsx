import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Save, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/objections")({
  component: ObjectionsPage,
});

type Objection = {
  id: string;
  slug: string;
  trigger: string;
  response: string;
  tip: string | null;
  sort_order: number;
};

function ObjectionsPage() {
  const { tenant, role } = useActiveTenant();
  const { user } = useAuth();
  const canEdit = role === "owner" || role === "admin";
  const [rows, setRows] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const { data } = await supabase
      .from("objections")
      .select("id, slug, trigger, response, tip, sort_order")
      .eq("tenant_id", tenant.id)
      .order("sort_order");
    setRows((data ?? []) as Objection[]);
    setLoading(false);
  }, [tenant]);

  useEffect(() => { load(); }, [load]);

  const addNew = async () => {
    if (!canEdit) return;
    if (!tenant || !user) return;
    const slug = `objection_${Date.now()}`;
    const { data, error } = await supabase
      .from("objections")
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        slug,
        trigger: "New objection",
        response: "Your response here.",
        sort_order: rows.length + 1,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setRows([...rows, data as Objection]);
  };

  const updateField = (id: string, key: keyof Objection, value: string) => {
    if (!canEdit) return;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  const save = async (row: Objection) => {
    if (!canEdit) return;
    setSaving(row.id);
    const { error } = await supabase
      .from("objections")
      .update({
        trigger: row.trigger,
        response: row.response,
        tip: row.tip || null,
      })
      .eq("id", row.id);
    setSaving(null);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const remove = async (id: string) => {
    if (!canEdit) return;
    if (!confirm("Delete this objection?")) return;
    const { error } = await supabase.from("objections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Objections</h1>
          <p className="text-sm text-muted-foreground">
            Quick-reference responses your team can pull up during live calls.
          </p>
        </div>
        {canEdit && (
          <Button onClick={addNew}><Plus className="mr-1 h-4 w-4" /> Add objection</Button>
        )}
      </header>

      {!canEdit && (
        <Card className="border-dashed bg-secondary/30">
          <CardContent className="flex items-start gap-2 py-4 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Read-only view. Members can use objections during calls, but only Admins and Owners can add, edit, or delete objection responses.</span>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {canEdit ? (
              <>No objections yet. Click <strong>Add objection</strong> above or apply a starter template from <strong>Settings → Templates</strong>.</>
            ) : (
              <>No objections have been added to this workspace yet.</>
            )}
          </CardContent>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-mono text-muted-foreground">{row.slug}</CardTitle>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => save(row)} disabled={saving === row.id}>
                    {saving === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(row.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {canEdit ? (
                <>
                  <div className="grid gap-1.5">
                    <Label>Trigger phrase</Label>
                    <Input value={row.trigger} onChange={(e) => updateField(row.id, "trigger", e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Response</Label>
                    <Textarea
                      value={row.response}
                      onChange={(e) => updateField(row.id, "response", e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Tip (optional)</Label>
                    <Input value={row.tip ?? ""} onChange={(e) => updateField(row.id, "tip", e.target.value)} />
                  </div>
                </>
              ) : (
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trigger phrase</div>
                    <div className="mt-1 rounded-md bg-secondary/40 px-3 py-2">{row.trigger}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Response</div>
                    <div className="mt-1 whitespace-pre-wrap rounded-md bg-secondary/40 px-3 py-2 leading-relaxed">{row.response}</div>
                  </div>
                  {row.tip && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tip</div>
                      <div className="mt-1 rounded-md bg-secondary/40 px-3 py-2 italic">{row.tip}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}