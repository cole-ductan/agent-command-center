import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/start-call")({
  component: StartCallPage,
});

function StartCallPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Button asChild size="sm" variant="ghost" className="mb-6">
        <Link to="/">Dashboard</Link>
      </Button>
      <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">RepPilot Core CRM</p>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">Start a Call</h1>
        <p className="mt-1 text-sm text-muted-foreground">Neutral start flow coming online.</p>
      </section>
    </div>
  );
}
