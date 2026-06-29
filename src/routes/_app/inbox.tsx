import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink, Info } from "lucide-react";

export const Route = createFileRoute("/_app/inbox")({
  component: InboxPage,
});

function InboxPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold md:text-4xl flex items-center gap-2">
          <Mail className="h-7 w-7 text-primary" /> Inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gmail integration is currently deferred.
        </p>
      </header>

      <div className="rounded-lg border bg-muted/30 p-6 text-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="space-y-3">
            <p>
              The in-app inbox is disabled because we trimmed the Google OAuth scopes
              down to Calendar + basic profile. Reading or listing Gmail messages
              requires the <code className="rounded bg-background px-1 py-0.5">gmail.readonly</code> scope,
              which is intentionally not requested right now.
            </p>
            <p className="text-muted-foreground">
              When Gmail features are formally re-enabled, this page will reconnect to
              your inbox automatically.
            </p>
            <Button asChild size="sm" variant="outline">
              <a href="https://mail.google.com" target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open Gmail in a new tab
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
