import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const { memberships } = useActiveTenant();
  const navigate = useNavigate();
  const callDelete = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const ownedWorkspaces = memberships.filter((m) => m.role === "owner");
  const ownedWithOthers = ownedWorkspaces; // server enforces "no other members" check

  const handleDelete = async () => {
    if (confirm !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    if (!window.confirm("This permanently deletes your account, owned workspaces, and all data. Continue?")) {
      return;
    }
    setBusy(true);
    try {
      await callDelete();
      toast.success("Account deleted");
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete account");
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your personal account.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div><span className="text-muted-foreground">Email: </span>{user.email}</div>
          <div className="text-muted-foreground text-xs">User ID: {user.id}</div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>
            Deleting your account is permanent. It will also delete every workspace where you are the
            sole owner along with all of that workspace's data (contacts, calls, notes, offers, etc.).
            Workspaces you only belong to as a member or admin will not be deleted — you'll just be
            removed from them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ownedWithOthers.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <p className="font-medium mb-1">You own these workspaces:</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {ownedWithOthers.map((m) => (
                  <li key={m.tenant.id}>{m.tenant.name}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs">
                If any of these still have other members, deletion will fail. Remove the other
                members first, or transfer ownership (promote them to owner in Members, then have
                them remove you).
              </p>
            </div>
          )}

          <div className="grid gap-1.5 max-w-sm">
            <Label htmlFor="confirm">Type <code className="px-1 rounded bg-muted">DELETE</code> to confirm</Label>
            <Input
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={busy || confirm !== "DELETE"}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete my account permanently
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
