import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { createStartOpportunity } from "@/lib/startOpportunity";

export const Route = createFileRoute("/_app/start-call")({
  component: StartCallPage,
});

function StartCallPage() {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [opportunityName, setOpportunityName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [notes, setNotes] = useState("");

  const submit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!user || !tenantId) return toast.error("No active workspace");
    if (!opportunityName.trim()) return toast.error("Opportunity name is required");
    if (!contactName.trim() && (phone.trim() || email.trim())) return toast.error("Contact name is required when phone or email is entered");
    const valueAmount = estimatedValue.trim() ? Number(estimatedValue) : null;
    if (valueAmount !== null && Number.isNaN(valueAmount)) return toast.error("Estimated value must be a number");
    setSaving(true);
    try {
      await createStartOpportunity({
        tenantId,
        userId: user.id,
        opportunityName,
        companyName,
        contactName,
        contactEmail: email,
        contactPhone: phone,
        targetDate,
        estimatedValue: valueAmount,
        notes: [notes, location ? `Location: ${location}` : null].filter(Boolean).join("\n"),
      });
      toast.success("Opportunity created");
      navigate({ to: "/opportunities" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create opportunity");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Button asChild size="sm" variant="ghost" className="mb-6"><Link to="/">Dashboard</Link></Button>
      <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">RepPilot Core CRM</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Start a Call</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a neutral opportunity first.</p>
        </div>
        <form className="grid gap-4" onSubmit={submit}>
          <TextField id="opportunity-name" label="Opportunity name *" value={opportunityName} onChange={setOpportunityName} placeholder="Acme Q3 rollout" />
          <TextField id="company-name" label="Company" value={companyName} onChange={setCompanyName} placeholder="Acme Logistics" />
          <div className="grid gap-3 md:grid-cols-2">
            <TextField id="contact-name" label="Contact name" value={contactName} onChange={setContactName} placeholder="Jordan Lee" />
            <TextField id="phone" label="Phone" value={phone} onChange={setPhone} placeholder="(555) 010-1000" />
          </div>
          <TextField id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="jordan@example.com" />
          <div className="grid gap-3 md:grid-cols-3">
            <TextField id="location" label="Location / region" value={location} onChange={setLocation} placeholder="Green Bay, WI" />
            <TextField id="target-date" label="Target date" type="date" value={targetDate} onChange={setTargetDate} />
            <TextField id="estimated-value" label="Estimated value" type="number" value={estimatedValue} onChange={setEstimatedValue} placeholder="12000" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything the rep should know before the call…" />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
            {saving ? "Creating…" : "Save Opportunity"}
          </Button>
        </form>
      </section>
    </div>
  );
}

function TextField({ id, label, value, onChange, placeholder, type = "text" }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
