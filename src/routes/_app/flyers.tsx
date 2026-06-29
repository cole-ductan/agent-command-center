import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Mail, FileText, Download, Search } from "lucide-react";
import { usePendingTray } from "@/lib/pendingTrayStore";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/flyers")({
  component: FlyersPage,
});

type FlyerPdf = {
  id: string;
  name: string;
  url: string;
  offer_slug: string | null;
};

function FlyersPage() {
  const { tenantId } = useActiveTenant();
  const [pdfs, setPdfs] = useState<FlyerPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<FlyerPdf | null>(null);
  const [query, setQuery] = useState("");
  const add = usePendingTray((s) => s.add);

  useEffect(() => {
    (async () => {
      if (!tenantId) {
        setPdfs([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("offer_pdfs")
        .select("id, name, offer_slug, public_url, drive_url, storage_path")
        .eq("tenant_id", tenantId)
        .order("sort_order");
      const mapped = await Promise.all(
        (data ?? []).map(async (p: any) => {
          let url = p.public_url || p.drive_url || "";
          if (p.storage_path) {
            const { data: signed } = await supabase.storage
              .from("offer-pdfs")
              .createSignedUrl(p.storage_path, 60 * 60 * 24 * 7);
            if (signed?.signedUrl) url = signed.signedUrl;
          }
          return { id: p.id, name: p.name, offer_slug: p.offer_slug, url };
        }),
      );
      setPdfs(mapped);
      setLoading(false);
    })();
  }, [tenantId]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? pdfs.filter((p) => p.name.toLowerCase().includes(q) || (p.offer_slug ?? "").toLowerCase().includes(q))
      : pdfs;
    const map = new Map<string, FlyerPdf[]>();
    for (const p of filtered) {
      const key = p.offer_slug ?? "uncategorized";
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([slug, items]) => ({ slug, items }));
  }, [pdfs, query]);

  const addToEmail = (p: FlyerPdf) => {
    add({ kind: "pdf", id: p.id, name: p.name, driveFileId: "", driveUrl: p.url });
    toast.success(`Added "${p.name}" to email tray`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="font-display text-xl font-semibold md:text-2xl">PDF Flyers</h1>
        <p className="text-xs text-muted-foreground md:text-sm">
          {pdfs.length} {pdfs.length === 1 ? "flyer" : "flyers"} in this workspace.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search flyers…"
          className="h-9 pl-8 text-sm"
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Loading flyers…
        </div>
      ) : pdfs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No flyers yet in this workspace. Upload PDFs in <span className="font-medium">Offers & Products</span>, or create
          a workspace from a starter template that includes flyers.
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No flyers match "{query}"
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.slug}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.slug.replace(/_/g, " ")}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.items.map((p) => (
                  <article
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border bg-card p-2.5 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium" title={p.name}>{p.name}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setPreviewing(p)} title="Quick view">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0" title="Download">
                        <a href={p.url} target="_blank" rel="noreferrer" download>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => addToEmail(p)} title="Add to email">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!previewing} onOpenChange={(v) => !v && setPreviewing(null)}>
        <DialogContent className="flex h-[90vh] w-[95vw] max-w-5xl flex-col gap-0 p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-sm font-medium">{previewing?.name}</DialogTitle>
          </DialogHeader>
          {previewing && (
            <iframe src={previewing.url} className="flex-1 w-full" title={previewing.name} />
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t p-3">
            {previewing && (
              <Button size="sm" variant="outline" asChild>
                <a href={previewing.url} target="_blank" rel="noreferrer" download>
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                </a>
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                if (!previewing) return;
                addToEmail(previewing);
                setPreviewing(null);
              }}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" /> Add to email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
