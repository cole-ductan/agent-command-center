import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { CheckCircle2, ChevronLeft, Clock, FileText, Loader2, Mail, Phone, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const liveCallSearchSchema = z.object({
  opportunityId: z.string().optional(),
});

export const Route = createFileRoute("/_app/live-call")({
  validateSearch: liveCallSearchSchema,
  component: LiveCallPage,
});

type Opportunity = {
  id: string;
  tenant_id: string;
  company_id: string | null;
  primary_person_id: string | null;
  name: string;
  stage_key: string;
  status: string;
  next_step: string | null;
  description: string | null;
};

type Company = { id: string; name: string };
type Person = { id: string; full_name: string; email: string | null; phone: string | null; title: string | null };

type Step = {
  key: string;
  title: string;
  prompt: string;
  script: string;
  capture: string[];
};

const DEFAULT_STEPS: Step[] = [
  {
    key: "pre_call",
    title: "Pre-call",
    prompt: "Confirm who you are calling and the reason for the conversation.",
    script: "Review the opportunity, company, contact, and desired next step before dialing.",
    capture: ["Call objective", "Known context", "Potential blocker"],
  },
  {
    key: "intro",
    title: "Intro",
    prompt: "Open clearly and earn permission to continue.",
    script: "Hi, this is {{rep}}. I’m calling about {{opportunity}}. Did I catch you at an okay time for a quick conversation?",
    capture: ["Reached contact?", "Permission to continue", "Best contact if different"],
  },
  {
    key: "discovery",
    title: "Discovery",
    prompt: "Understand the current situation before pitching.",
    script: "What prompted you to look at this now, and what would make this worth moving forward?",
    capture: ["Current process", "Pain points", "Decision criteria"],
  },
  {
    key: "qualify",
    title: "Qualify",
    prompt: "Check fit, urgency, authority, and next-step readiness.",
    script: "Who else would weigh in on this, and what timeline are you hoping to work toward?",
    capture: ["Timeline", "Decision maker", "Budget / value range"],
  },
  {
    key: "value",
    title: "Value positioning",
    prompt: "Connect the offer to the problem they actually described.",
    script: "Based on what you said, the main value would be helping with {{pain}} while making the next step easier to execute.",
    capture: ["Primary value angle", "Offer fit", "Proof point needed"],
  },
  {
    key: "objections",
    title: "Objections",
    prompt: "Name concerns directly and slow down the conversation.",
    script: "That makes sense. Is the main concern timing, budget, trust, or whether this is the right fit?",
    capture: ["Objection type", "Response given", "Remaining concern"],
  },
  {
    key: "close",
    title: "Close / next step",
    prompt: "Convert the call into a concrete next action.",
    script: "The best next step is to schedule a focused follow-up so we can confirm fit and map the details. Does {{time}} work?",
    capture: ["Agreed next step", "Follow-up date", "Owner"],
  },
  {
    key: "wrap",
    title: "Wrap",
    prompt: "Summarize the call and log what should happen next.",
    script: "Before we wrap, I’ll send a short recap with the next step and anything we need from you.",
    capture: ["Outcome", "Summary", "Follow-up task"],
  },
];

function LiveCallPage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const navigate = useNavigate();
  const { opportunityId } = Route.useSearch();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [activeStep, setActiveStep] = useState(DEFAULT_STEPS[0].key);
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const step = useMemo(() => DEFAULT_STEPS.find((item) => item.key === activeStep) ?? DEFAULT_STEPS[0], [activeStep]);

  useEffect(() => {
    const load = async () => {
      if (!tenantId || !opportunityId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const db = supabase as unknown as { from: (table: string) => any };
        const { data, error: opportunityError } = await db
          .from("opportunities")
          .select("id,tenant_id,company_id,primary_person_id,name,stage_key,status,next_step,description")
          .eq("tenant_id", tenantId)
          .eq("id", opportunityId)
          .single();
        if (opportunityError) throw opportunityError;
        const opp = data as Opportunity;
        setOpportunity(opp);
        setNotes(opp.description ?? "");

        const [companyResult, personResult] = await Promise.all([
          opp.company_id ? db.from("companies").select("id,name").eq("tenant_id", tenantId).eq("id", opp.company_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
          opp.primary_person_id ? db.from("people").select("id,full_name,email,phone,title").eq("tenant_id", tenantId).eq("id", opp.primary_person_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        ]);
        if (companyResult.error) throw companyResult.error;
        if (personResult.error) throw personResult.error;
        setCompany(companyResult.data as Company | null);
        setPerson(personResult.data as Person | null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load call guidance.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [tenantId, opportunityId]);

  const saveCall = async () => {
    if (!user || !tenantId || !opportunity) return;
    setSaving(true);
    try {
      const db = supabase as unknown as { from: (table: string) => any };
      const summary = [outcome ? `Outcome: ${outcome}` : null, notes.trim()].filter(Boolean).join("\n\n");
      const { error: interactionError } = await db.from("interactions").insert({
        tenant_id: tenantId,
        company_id: opportunity.company_id,
        person_id: opportunity.primary_person_id,
        opportunity_id: opportunity.id,
        created_by: user.id,
        interaction_type: "call",
        direction: "outbound",
        subject: `Live call: ${opportunity.name}`,
        summary: summary || null,
        outcome: outcome || null,
        metadata: { source: "neutral_live_call_shell", active_step: activeStep },
      });
      if (interactionError) throw interactionError;
      const { error: opportunityError } = await db.from("opportunities").update({
        description: notes.trim() || null,
        next_step: outcome || opportunity.next_step,
      }).eq("tenant_id", tenantId).eq("id", opportunity.id);
      if (opportunityError) throw opportunityError;
      toast.success("Call logged");
      navigate({ to: "/opportunities" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log call");
    } finally {
      setSaving(false);
    }
  };

  if (!opportunityId) {
    return <EmptyState title="No opportunity selected" body="Start from an opportunity or use Start Call to create one." />;
  }

  if (loading) {
    return <StateMessage icon={<Loader2 className="h-4 w-4 animate-spin" />}>Loading call guidance…</StateMessage>;
  }

  if (error || !opportunity) {
    return <EmptyState title="Could not load call" body={error ?? "The selected opportunity was not found."} />;
  }

  const script = step.script
    .replace("{{rep}}", (user?.email ?? "your rep").split("@")[0])
    .replace("{{opportunity}}", opportunity.name)
    .replace("{{pain}}", "their stated problem")
    .replace("{{time}}", "a specific time");

  const emailSubject = `Next steps for ${opportunity.name}`;
  const emailBody = buildFollowUpEmail({ opportunity, company, person, outcome, notes });

  const copyEmail = async () => {
    await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    toast.success("Email copied");
  };

  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col bg-background">
      <header className="border-b bg-card/95 px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link to="/opportunities"><ChevronLeft className="mr-1 h-4 w-4" /> Opportunities</Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">RepPilot Live Call</p>
            <h1 className="truncate font-display text-xl font-semibold">{opportunity.name}</h1>
          </div>
          <Button onClick={saveCall} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Log Call
          </Button>
        </div>
      </header>

      <div className="grid flex-1 gap-0 lg:grid-cols-[260px_minmax(0,1fr)_390px]">
        <aside className="border-b bg-card/50 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call steps</div>
          <div className="space-y-1">
            {DEFAULT_STEPS.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveStep(item.key)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${activeStep === item.key ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">{index + 1}</span>
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-w-0 p-4 md:p-6">
          <section className="mb-4 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="grid gap-3 md:grid-cols-3">
              <Info label="Company" value={company?.name ?? "No company"} />
              <Info label="Contact" value={person?.full_name ?? "No primary person"} />
              <Info label="Stage" value={humanize(opportunity.stage_key)} />
            </div>
            {person?.phone || person?.email ? (
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {person.phone && <span>{person.phone}</span>}
                {person.email && <span>{person.email}</span>}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <Phone className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Current step</span>
            </div>
            <h2 className="font-display text-2xl font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{step.prompt}</p>
            <div className="mt-5 rounded-lg bg-secondary/50 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Script</div>
              <p className="text-sm leading-6">{script}</p>
            </div>
            <div className="mt-5 grid gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Capture</div>
              {step.capture.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-4 border-t bg-card/50 p-4 lg:border-l lg:border-t-0">
          <section className="rounded-xl border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-4 w-4" /> Script guidance
            </div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{script}</p>
            <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              Keep the call conversational. Use the script as a rail, not a cage.
            </div>
          </section>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Mail className="h-4 w-4" /> Follow-up email
            </div>
            <Label className="text-xs">Subject</Label>
            <div className="mt-1 rounded-md border bg-secondary/30 px-3 py-2 text-sm">{emailSubject}</div>
            <Textarea className="mt-3" value={emailBody} readOnly rows={7} />
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={copyEmail}>Copy email</Button>
          </section>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</div>
            <div className="space-y-2">
              <ResourceCard title="Discovery recap" body="Use after a good fit call to summarize pain, fit, and next step." />
              <ResourceCard title="Objection handling" body="Use when the prospect is unsure on timing, budget, trust, or fit." />
              <ResourceCard title="Proposal prep" body="Use after qualification when the next step needs a concrete offer." />
            </div>
          </section>

          <section className="rounded-xl border bg-background p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-4 w-4" /> Call outcome
            </div>
            <Textarea value={outcome} onChange={(event) => setOutcome(event.target.value)} placeholder="Connected, voicemail, follow-up booked…" rows={3} />
          </section>

          <section className="rounded-xl border bg-background p-4">
            <Label htmlFor="call-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call notes</Label>
            <Textarea id="call-notes" className="mt-2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Capture discovery, objections, decision criteria, and next steps…" rows={8} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function ResourceCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-secondary/30 p-3">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

function StateMessage({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <div className="m-6 flex items-center gap-2 rounded-xl border bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-card)]">{icon}{children}</div>;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <Button asChild className="mt-4"><Link to="/start-call">Start Call</Link></Button>
      </div>
    </div>
  );
}

function buildFollowUpEmail({ opportunity, company, person, outcome, notes }: { opportunity: Opportunity; company: Company | null; person: Person | null; outcome: string; notes: string }) {
  const firstName = person?.full_name?.split(" ")[0] || "there";
  return [
    `Hi ${firstName},`,
    "",
    `Thanks for taking the time to talk about ${opportunity.name}${company?.name ? ` with ${company.name}` : ""}.`,
    outcome ? `Based on our conversation, the current outcome is: ${outcome}.` : "Based on our conversation, I wanted to send a quick recap and next step.",
    notes.trim() ? `\nQuick recap:\n${notes.trim()}` : "",
    "",
    "Next step:",
    opportunity.next_step || "Let’s confirm the best follow-up time and who else should be included.",
    "",
    "Thanks,",
    "",
  ].filter(Boolean).join("\n");
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
