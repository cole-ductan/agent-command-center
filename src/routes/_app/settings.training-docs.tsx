import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/training-docs")({
  component: TrainingDocsPage,
});

type Doc = {
  id: string;
  title: string;
  description: string | null;
  external_url: string | null;
  category: string | null;
  created_at: string;
};

function TrainingDocsPage() {
  const { tenant, role } = useActiveTenant();
  const { user } = useAuth();
  const canEdit = role === "owner" || role === "admin";
  const [rows, setRows] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const { data } = await supabase
      .from("training_documents")
      .select("id, title, description, external_url, category, created_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Doc[]);
    setLoading(false);
  }, [tenant]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!tenant || !user || !title.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("training_documents").insert({
        tenant_id: tenant.id,
        uploaded_by: user.id,
        title: title.trim(),
        description: desc.trim() || null,
        external_url: url.trim() || null,
        category: category.trim() || null,
      });
      if (error) throw error;
      setTitle(""); setDesc(""); setUrl(""); setCategory("");
      toast.success("Document added");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const { error } = await supabase.from("training_documents").delete().eq("id", id);
    if (error) toast.error(error.message);
    else load();
  };

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Training Docs</h1>
        <p className="text-sm text-muted-foreground">
          Reference materials, playbooks, and PDFs your team can pull up. (Direct file upload coming next —
          for now, paste a link to a Drive / Notion / PDF URL.)
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Add a document</CardTitle>
          <CardDescription>Link to anything on the web your team should reference.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Onboarding playbook" />
          </div>
          <div className="grid gap-1.5">
            <Label>Link URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="grid gap-1.5 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Scripts, Offers, Training…" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
          </div>
          <Button onClick={add} disabled={adding || !title.trim()}>
            {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add document
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {loading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground text-sm">No docs yet.</div>
        ) : (
          rows.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{d.title}</div>
                    {d.category && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground border px-1.5 py-0.5 rounded">
                        {d.category}
                      </span>
                    )}
                  </div>
                  {d.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{d.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {d.external_url && (
                    <Button asChild size="icon" variant="ghost">
                      <a href={d.external_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
