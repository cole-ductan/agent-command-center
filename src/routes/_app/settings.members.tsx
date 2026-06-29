import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/members")({
  component: MembersPage,
});

type Member = {
  user_id: string;
  role: "owner" | "admin" | "member";
  email: string | null;
  full_name: string | null;
};

type Invite = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  token: string;
  expires_at: string;
  accepted_at: string | null;
};

function MembersPage() {
  const { tenant, role } = useActiveTenant();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);

  const canManage = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("tenant_members")
      .select("user_id, role, profiles:profiles!tenant_members_user_id_fkey(email, full_name)")
      .eq("tenant_id", tenant.id);
    const ms: Member[] = (rows ?? []).map((r: any) => ({
      user_id: r.user_id,
      role: r.role,
      email: r.profiles?.email ?? null,
      full_name: r.profiles?.full_name ?? null,
    }));
    setMembers(ms);

    const { data: inv } = await supabase
      .from("tenant_invites")
      .select("id, email, role, token, expires_at, accepted_at")
      .eq("tenant_id", tenant.id)
      .is("accepted_at", null);
    setInvites((inv ?? []) as Invite[]);
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    load();
  }, [load]);

  const sendInvite = async () => {
    if (!tenant || !inviteEmail.trim()) return;
    const me = (await supabase.auth.getUser()).data.user;
    if (!me) return;
    setInviting(true);
    try {
      const { error } = await supabase.from("tenant_invites").insert({
        tenant_id: tenant.id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: me.id,
      });
      if (error) throw error;
      toast.success(`Invite created for ${inviteEmail}`);
      setInviteEmail("");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const removeInvite = async (id: string) => {
    await supabase.from("tenant_invites").delete().eq("id", id);
    load();
  };

  const removeMember = async (userId: string) => {
    if (!tenant) return;
    if (!confirm("Remove this member from the workspace?")) return;
    const { error } = await supabase
      .from("tenant_members")
      .delete()
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId);
    if (error) toast.error(error.message);
    else {
      toast.success("Member removed");
      load();
    }
  };

  const changeRole = async (userId: string, newRole: "admin" | "member" | "owner") => {
    if (!tenant) return;
    const { error } = await supabase
      .from("tenant_members")
      .update({ role: newRole })
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId);
    if (error) toast.error(error.message);
    else load();
  };

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">Manage who has access to {tenant.name}.</p>
      </header>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Invite teammate</CardTitle>
            <CardDescription>
              Creates an invite token. (Email delivery is not wired up yet — share the invite link manually for now.)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="person@company.com"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Send invite
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="text-muted-foreground text-sm">Loading…</div>
          ) : members.length === 0 ? (
            <div className="text-muted-foreground text-sm">No members yet.</div>
          ) : (
            members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.full_name || m.email || m.user_id}</div>
                  {m.email && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {canManage && m.role !== "owner" ? (
                    <Select value={m.role} onValueChange={(v: any) => changeRole(m.user_id, v)}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{m.role}</span>
                  )}
                  {canManage && m.role !== "owner" && (
                    <Button size="icon" variant="ghost" onClick={() => removeMember(m.user_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending invites</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.role} · expires {new Date(i.expires_at).toLocaleDateString()}
                  </div>
                </div>
                {canManage && (
                  <Button size="icon" variant="ghost" onClick={() => removeInvite(i.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
