import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

// Common domain typos → suggested correction. We block submission and ask the
// user to confirm/fix. Catches the most frequent fat-finger mistakes.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.co": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "yahoo.con": "yahoo.com",
  "yaho.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com",
};

function detectEmailTypo(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).toLowerCase();
  return DOMAIN_TYPOS[domain] ?? null;
}

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
      .select("user_id, role")
      .eq("tenant_id", tenant.id);
    const userIds = (rows ?? []).map((r: any) => r.user_id);
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, email, full_name").in("id", userIds)
      : { data: [] as any[] };
    const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const ms: Member[] = (rows ?? []).map((r: any) => {
      const p = byId.get(r.user_id);
      return { user_id: r.user_id, role: r.role, email: p?.email ?? null, full_name: p?.full_name ?? null };
    });
    setMembers(ms);

    const { data: inv } = await supabase
      .from("tenant_invites")
      .select("id, email, role, token, expires_at, accepted_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    setInvites((inv ?? []) as Invite[]);
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    load();
  }, [load]);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sendInvite = async () => {
    if (!tenant) return;
    const parsed = emailSchema.safeParse(inviteEmail);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    const cleanEmail = parsed.data;
    const typo = detectEmailTypo(cleanEmail);
    if (typo) {
      setEmailError(
        `That domain looks like a typo. Did you mean ...@${typo}? Fix it or re-enter to confirm.`,
      );
      // Auto-correct the field so the next click sends; user can override.
      setInviteEmail(cleanEmail.replace(/@[^@]+$/, `@${typo}`));
      return;
    }
    setEmailError(null);
    const me = (await supabase.auth.getUser()).data.user;
    if (!me) return;
    setInviting(true);
    try {
      const { error } = await supabase.from("tenant_invites").insert({
        tenant_id: tenant.id,
        email: cleanEmail,
        role: inviteRole,
        invited_by: me.id,
      });
      if (error) throw error;
      toast.success(`Invite created for ${cleanEmail}`);
      setInviteEmail("");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to invite");
    } finally {
      setInviting(false);
    }
  };


  const publicAppOrigin = () => {
    const fallback = "https://call-wingman-pro.lovable.app";
    if (typeof window === "undefined") return fallback;

    const { hostname, origin } = window.location;
    const isEditorOrPreview =
      hostname === "localhost" ||
      hostname.includes("id-preview--") ||
      hostname.includes("lovableproject.com") ||
      hostname.endsWith("-dev.lovable.app");

    return isEditorOrPreview ? fallback : origin;
  };

  const inviteUrl = (token: string) => `${publicAppOrigin()}/invite/${token}`;

  const copyInviteLink = async (invite: Invite) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(invite.token));
      setCopiedId(invite.id);
      toast.success("Invite link copied");
      setTimeout(() => setCopiedId((c) => (c === invite.id ? null : c)), 1500);
    } catch {
      toast.error("Could not copy — link: " + inviteUrl(invite.token));
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
              Creates an invite token. Email delivery is not wired up yet — use &ldquo;Copy link&rdquo; in
              the Pending invites list below and send it to the teammate manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="person@company.com"
                aria-invalid={!!emailError}
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
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
          <CardHeader><CardTitle>Invites</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invites.map((i) => {
              const accepted = !!i.accepted_at;
              const expired = !accepted && new Date(i.expires_at) < new Date();
              return (
                <div key={i.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{i.email}</span>
                      <span
                        className={`text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 ${
                          accepted
                            ? "bg-emerald-500/10 text-emerald-600"
                            : expired
                              ? "bg-destructive/10 text-destructive"
                              : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {accepted ? "Accepted" : expired ? "Expired" : "Pending"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {i.role} ·{" "}
                      {accepted
                        ? `accepted ${new Date(i.accepted_at!).toLocaleDateString()}`
                        : `expires ${new Date(i.expires_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!accepted && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => copyInviteLink(i)}
                        title="Copy invite link"
                      >
                        {copiedId === i.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedId === i.id ? "Copied" : "Copy link"}
                      </Button>
                    )}
                    {canManage && (
                      <Button size="icon" variant="ghost" onClick={() => removeInvite(i.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
