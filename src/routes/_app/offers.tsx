import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Mail, FileText, Download, Package, Search, ExternalLink } from "lucide-react";
import { usePendingTray } from "@/lib/pendingTrayStore";
import { OFFER_EXPANDED } from "@/lib/offerExpanded";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Products" },
      { name: "description", content: "Your workspace's offers with PDFs and email-ready details." },
    ],
  }),
  component: OffersPage,
});

function stripInternalSections(text: string): string {
  if (!text) return text;
  const internalHeaders = /^(HOW TO DELIVER IT ON THE CALL|TC NOTES)\s*:?\s*$/im;
  const lines = text.split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (internalHeaders.test(line.trim())) {
      skipping = true;
      continue;
    }
    if (skipping && /^[A-Z][A-Z0-9 &/+\-]{2,}:\s*$/.test(line.trim())) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}

type Offer = {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  cost: string | null;
  when_to_introduce: string | null;
  details: string | null;
  expanded_details: string | null;
};

type OfferPdf = {
  id: string;
  name: string;
  url: string;
  offer_slug: string | null;
};

function OffersPage() {
  const { tenantId, tenant } = useActiveTenant();
  const catalogUrl = ((tenant?.settings as any)?.product_catalog_url as string | undefined) ?? "";
  const [offers, setOffers] = useState<Offer[]>([]);
  const [pdfs, setPdfs] = useState<OfferPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState<OfferPdf | null>(null);
  const [query, setQuery] = useState("");
  const add = usePendingTray((s) => s.add);

  useEffect(() => {
    (async () => {
      if (!tenantId) {
        setOffers([]);
        setPdfs([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const [oRes, pRes] = await Promise.all([
        supabase.from("offers").select("*").eq("tenant_id", tenantId).order("sort_order"),
        supabase
          .from("offer_pdfs")
          .select("id, name, offer_slug, public_url, drive_url")
          .eq("tenant_id", tenantId)
          .order("sort_order"),
      ]);
      setOffers((oRes.data ?? []) as Offer[]);
      setPdfs(
        (pRes.data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          offer_slug: p.offer_slug,
          url: p.public_url || p.drive_url || "",
        })),
      );
      setLoading(false);
    })();
  }, [tenantId]);

  const q = query.trim().toLowerCase();

  const filteredOffers = useMemo(() => {
    if (!q) return offers;
    return offers.filter((o) => {
      const detail = o.expanded_details || OFFER_EXPANDED[o.slug] || o.details || "";
      return (
        o.name.toLowerCase().includes(q) ||
        (o.type ?? "").toLowerCase().includes(q) ||
        detail.toLowerCase().includes(q)
      );
    });
  }, [offers, q]);

  const pdfsFor = (slug: string) => pdfs.filter((p) => p.offer_slug === slug);

  const defaultOpen: string[] = q
    ? filteredOffers.map((o) => `offer-${o.id}`)
    : [filteredOffers[0] ? `offer-${filteredOffers[0].id}` : ""].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">Offers & Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap any offer to expand. Use &ldquo;Add to email&rdquo; to drop items into your pending email tray.
          </p>
        </div>
        {catalogUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={catalogUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Product Catalog
            </a>
          </Button>
        )}
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search offers…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Package className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Offers</h2>
          <Badge variant="secondary" className="ml-1">{filteredOffers.length}</Badge>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading offers…</div>
        ) : filteredOffers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {offers.length === 0
                ? "No offers yet in this workspace. Add them in Playbook → Offers, or create a workspace from a starter template."
                : `No offers match "${query}".`}
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2">
            {filteredOffers.map((o) => {
              const offerPdfs = pdfsFor(o.slug);
              const detail = o.expanded_details || OFFER_EXPANDED[o.slug] || o.details || "";
              return (
                <AccordionItem
                  key={o.id}
                  value={`offer-${o.id}`}
                  className="border rounded-lg bg-card overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/40">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary-foreground"
                        style={{ background: "var(--gradient-fairway)" }}
                      >
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="font-medium text-sm md:text-base truncate">{o.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {o.type}
                          {o.cost ? ` • ${o.cost}` : ""}
                        </div>
                      </div>
                      {offerPdfs.length > 0 && (
                        <Badge variant="outline" className="ml-auto mr-2 shrink-0 gap-1">
                          <FileText className="h-3 w-3" /> {offerPdfs.length}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    {o.when_to_introduce && (
                      <p className="mb-2 text-[11px] italic text-muted-foreground">When: {o.when_to_introduce}</p>
                    )}
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                      {detail}
                    </pre>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          add({ kind: "offer", id: o.id, name: o.name, details: stripInternalSections(detail) });
                          toast.success(`Added "${o.name}" to email tray`);
                        }}
                      >
                        <Mail className="mr-1.5 h-3 w-3" /> Add to email
                      </Button>
                    </div>
                    {offerPdfs.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t pt-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">PDFs</div>
                        {offerPdfs.map((p) => (
                          <div key={p.id} className="flex items-center gap-2 rounded-md border bg-secondary/30 px-2 py-1.5">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="flex-1 truncate text-xs" title={p.name}>{p.name}</span>
                            <button onClick={() => setPreviewing(p)} className="rounded p-1 hover:bg-background" title="Preview">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <a href={p.url} target="_blank" rel="noreferrer" download className="rounded p-1 hover:bg-background" title="Download">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => {
                                add({ kind: "pdf", id: p.id, name: p.name, driveFileId: "", driveUrl: p.url });
                                toast.success(`Added "${p.name}" to email tray`);
                              }}
                              className="rounded p-1 hover:bg-background"
                              title="Add to email"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </section>

      <Dialog open={!!previewing} onOpenChange={(v) => !v && setPreviewing(null)}>
        <DialogContent className="flex h-[85vh] w-[95vw] max-w-5xl flex-col gap-0 p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle className="text-sm font-medium">{previewing?.name}</DialogTitle>
          </DialogHeader>
          {previewing && <iframe src={previewing.url} className="flex-1 w-full" title={previewing.name} />}
          <div className="flex justify-end gap-2 border-t p-3">
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
                add({ kind: "pdf", id: previewing.id, name: previewing.name, driveFileId: "", driveUrl: previewing.url });
                toast.success("Added to email tray");
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
