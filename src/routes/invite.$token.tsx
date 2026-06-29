import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
  component: AcceptInvitePage,
});

type Status =
  | { kind: "loading" }
  | { kind: "signed_out" }
  | { kind: "accepting" }
  | { kind: "accepted" }
  | { kind: "error"; message: string };

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        setStatus({ kind: "signed_out" });
        return;
      }
      setStatus({ kind: "accepting" });
      const { data: result, error } = await supabase.rpc("accept_tenant_invite", {
        p_token: token,
      });
      if (cancelled) return;
      if (error) {
        setStatus({ kind: "error", message: error.message });
        return;
      }
      setStatus({ kind: "accepted" });
      toast.success("Joined workspace");
      // Give router a moment, then send them to the dashboard
      setTimeout(() => {
        router.invalidate();
        navigate({ to: "/", replace: true });
      }, 600);
      // Log result for debugging
      console.log("invite accepted", result);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, router]);

  const goSignIn = () => {
    // Save destination so /auth can return here
    try {
      sessionStorage.setItem("post_auth_redirect", `/invite/${token}`);
    } catch {}
    navigate({ to: "/auth", search: { redirect: `/invite/${token}` } as any });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center space-y-4">
        <h1 className="text-xl font-semibold">Workspace invitation</h1>

        {status.kind === "loading" || status.kind === "accepting" ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {status.kind === "loading" ? "Checking your session…" : "Joining workspace…"}
          </div>
        ) : null}

        {status.kind === "signed_out" ? (
          <>
            <p className="text-sm text-muted-foreground">
              Sign in or create an account with the email this invite was sent to, then come back to
              accept.
            </p>
            <Button onClick={goSignIn} className="w-full">
              Continue to sign in
            </Button>
          </>
        ) : null}

        {status.kind === "accepted" ? (
          <div className="flex flex-col items-center gap-2 text-emerald-500">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm">You're in. Redirecting…</p>
          </div>
        ) : null}

        {status.kind === "error" ? (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">{status.message}</p>
            </div>
            <Button variant="outline" onClick={() => navigate({ to: "/" })} className="w-full">
              Back to app
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
