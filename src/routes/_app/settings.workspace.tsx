import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

export const Route = createFileRoute("/_app/settings/workspace")({
  component: WorkspaceSettingsPage,
});

function WorkspaceSettingsPage() {
  const navigate = useNavigate();
  const { tenant, role, refresh } = useActiveTenant();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [productCatalogUrl, setProductCatalogUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setIndustry(tenant.industry ?? "");
      setLogoUrl(tenant.logo_url ?? "");
      setBrandColor(tenant.brand_color ?? "");
      setProductCatalogUrl(((tenant.settings as any)?.product_catalog_url as string | undefined) ?? "");
    }
  }, [tenant]);

  const canEdit = role === "owner" || role === "admin";

  const save = async () => {
    if (!tenant) return;
    const url = productCatalogUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      toast.error("Product Catalog URL must start with http:// or https://");
      return;
    }
    setSaving(true);
    try {
      const mergedSettings = {
        ...(tenant.settings ?? {}),
        product_catalog_url: url || null,
      };
      const { error } = await supabase
        .from("tenants")
        .update({
          name: name.trim() || tenant.name,
          industry: industry.trim() || null,
          logo_url: logoUrl.trim() || null,
          brand_color: brandColor.trim() || null,
          settings: mergedSettings,
        })
        .eq("id", tenant.id);
      if (error) throw error;
      await refresh();
      toast.success("Workspace updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!tenant) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Workspace</h1>
        <p className="text-sm text-muted-foreground">Branding, name, and industry for {tenant.name}.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
          <CardDescription>Shown to your team in the app shell.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="logo">Logo URL</Label>
            <Input
              id="logo"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
              disabled={!canEdit}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="color">Brand color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#0f7a3d or var(--gradient-fairway)"
                disabled={!canEdit}
              />
              {brandColor && (
                <div
                  className="h-9 w-9 rounded-md border"
                  style={{ background: brandColor }}
                  aria-label="Preview"
                />
              )}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="catalog">Product Catalog URL</Label>
            <Input
              id="catalog"
              type="url"
              value={productCatalogUrl}
              onChange={(e) => setProductCatalogUrl(e.target.value)}
              placeholder="https://yourcompany.com/catalog"
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              When set, a &ldquo;Product Catalog&rdquo; button appears on the Offers &amp; Products page.
            </p>
          </div>
          <Button onClick={save} disabled={!canEdit || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
          {!canEdit && (
            <p className="text-xs text-muted-foreground">Only owners or admins can edit workspace settings.</p>
          )}
        </CardContent>
      </Card>

      {role === "owner" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Permanently delete this workspace and all of its leads, notes, calls, schedules, and other data. This
              cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete workspace
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{tenant.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the workspace and every record inside it (leads, events, tasks, notes,
                    calls, schedules, goals, playbook content). Type <b>{tenant.name}</b> below to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                  <Input
                    placeholder={tenant.name}
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmName("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleting || confirmName.trim() !== tenant.name}
                    onClick={async (e) => {
                      e.preventDefault();
                      setDeleting(true);
                      const { error } = await (supabase.rpc as any)("delete_workspace", {
                        p_tenant_id: tenant.id,
                      });
                      setDeleting(false);
                      if (error) {
                        toast.error(error.message);
                        return;
                      }
                      toast.success("Workspace deleted");
                      setConfirmName("");
                      await refresh();
                      navigate({ to: "/" });
                    }}
                  >
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
