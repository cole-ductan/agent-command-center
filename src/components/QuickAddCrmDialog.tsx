import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarClock, FileText, KanbanSquare, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type QuickAddKind = "company" | "person" | "opportunity" | "task" | "note";

export type CompanyOption = {
  id: string;
  name: string;
};

export type PersonOption = {
  id: string;
  full_name: string;
};

export type OpportunityOption = {
  id: string;
  name: string;
};

type QuickAddForm = {
  companyName: string;
  industry: string;
  website: string;
  companyPhone: string;
  companyNotes: string;
  fullName: string;
  personTitle: string;
  email: string;
  personPhone: string;
  companyId: string;
  opportunityName: string;
  stageKey: string;
  valueAmount: string;
  expectedCloseDate: string;
  nextStep: string;
  personId: string;
  opportunityId: string;
  nextAction: string;
  nextActionAt: string;
  priority: string;
  noteTitle: string;
  noteBody: string;
};

const quickAddMeta = {
  company: {
    title: "Add Company",
    description: "Create a neutral company/account record.",
    success: "Company added",
    icon: Building2,
  },
  person: {
    title: "Add Person",
    description: "Create a contact and optionally connect them to a company.",
    success: "Person added",
    icon: UserRound,
  },
  opportunity: {
    title: "Add Opportunity",
    description: "Create a sales opportunity attached to optional company/person context.",
    success: "Opportunity added",
    icon: KanbanSquare,
  },
  task: {
    title: "Add Task",
    description: "Create a next action and optionally attach CRM context.",
    success: "Task added",
    icon: CalendarClock,
  },
  note: {
    title: "Add Note",
    description: "Capture a note and optionally attach CRM context.",
    success: "Note added",
    icon: FileText,
  },
} satisfies Record<QuickAddKind, { title: string; description: string; success: string; icon: typeof Building2 }>;

function defaultDueDateTime() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function emptyForm(): QuickAddForm {
  return {
    companyName: "",
    industry: "",
    website: "",
    companyPhone: "",
    companyNotes: "",
    fullName: "",
    personTitle: "",
    email: "",
    personPhone: "",
    companyId: "",
    opportunityName: "",
    stageKey: "new",
    valueAmount: "",
    expectedCloseDate: "",
    nextStep: "",
    personId: "",
    opportunityId: "",
    nextAction: "",
    nextActionAt: defaultDueDateTime(),
    priority: "normal",
    noteTitle: "",
    noteBody: "",
  };
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function QuickAddCrmDialog({
  open,
  kind,
  tenantId,
  userId,
  companies,
  people,
  opportunities,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  kind: QuickAddKind | null;
  tenantId: string | null;
  userId: string | undefined;
  companies: CompanyOption[];
  people: PersonOption[];
  opportunities: OpportunityOption[];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void | Promise<void>;
}) {
  const [form, setForm] = useState<QuickAddForm>(() => emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open, kind]);

  const meta = useMemo(() => (kind ? quickAddMeta[kind] : null), [kind]);
  const Icon = meta?.icon;

  const update = (field: keyof QuickAddForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    if (!kind || !meta) return;
    if (!tenantId || !userId) {
      toast.error("No active workspace");
      return;
    }

    const db = supabase as unknown as {
      from: (table: string) => any;
    };

    setSaving(true);
    try {
      if (kind === "company") {
        if (!form.companyName.trim()) {
          toast.error("Company name is required");
          return;
        }

        const { error } = await db.from("companies").insert({
          tenant_id: tenantId,
          created_by: userId,
          owner_id: userId,
          name: form.companyName.trim(),
          industry: nullable(form.industry),
          website: nullable(form.website),
          phone: nullable(form.companyPhone),
          notes: nullable(form.companyNotes),
        });
        if (error) throw error;
      }

      if (kind === "person") {
        if (!form.fullName.trim()) {
          toast.error("Person name is required");
          return;
        }

        const { error } = await db.from("people").insert({
          tenant_id: tenantId,
          company_id: form.companyId || null,
          created_by: userId,
          owner_id: userId,
          full_name: form.fullName.trim(),
          title: nullable(form.personTitle),
          email: nullable(form.email),
          phone: nullable(form.personPhone),
        });
        if (error) throw error;
      }

      if (kind === "opportunity") {
        if (!form.opportunityName.trim()) {
          toast.error("Opportunity name is required");
          return;
        }

        const valueAmount = form.valueAmount.trim() ? Number(form.valueAmount) : null;
        if (valueAmount !== null && Number.isNaN(valueAmount)) {
          toast.error("Opportunity value must be a number");
          return;
        }

        const { data, error } = await db
          .from("opportunities")
          .insert({
            tenant_id: tenantId,
            company_id: form.companyId || null,
            primary_person_id: form.personId || null,
            created_by: userId,
            owner_id: userId,
            name: form.opportunityName.trim(),
            stage_key: form.stageKey.trim() || "new",
            status: "open",
            value_amount: valueAmount,
            expected_close_date: form.expectedCloseDate || null,
            next_step: nullable(form.nextStep),
          })
          .select("id")
          .single();
        if (error) throw error;

        if (form.personId && data?.id) {
          const { error: linkError } = await db.from("opportunity_people").insert({
            tenant_id: tenantId,
            opportunity_id: data.id,
            person_id: form.personId,
            role: "Primary contact",
            is_primary: true,
          });
          if (linkError) throw linkError;
        }
      }

      if (kind === "task") {
        if (!form.nextAction.trim()) {
          toast.error("Task title is required");
          return;
        }
        if (!form.nextActionAt) {
          toast.error("Task due date is required");
          return;
        }

        const { error } = await db.from("tasks").insert({
          tenant_id: tenantId,
          user_id: userId,
          company_id: form.companyId || null,
          person_id: form.personId || null,
          opportunity_id: form.opportunityId || null,
          next_action: form.nextAction.trim(),
          next_action_at: new Date(form.nextActionAt).toISOString(),
          priority: form.priority || "normal",
          status: "pending",
        });
        if (error) throw error;
      }

      if (kind === "note") {
        if (!form.noteBody.trim()) {
          toast.error("Note body is required");
          return;
        }

        const { error } = await db.from("notes").insert({
          tenant_id: tenantId,
          user_id: userId,
          company_id: form.companyId || null,
          person_id: form.personId || null,
          opportunity_id: form.opportunityId || null,
          title: nullable(form.noteTitle),
          body: form.noteBody.trim(),
        });
        if (error) throw error;
      }

      toast.success(meta.success);
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save record";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!kind || !meta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            {meta.title}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {kind === "company" && (
            <>
              <TextField label="Company name *" value={form.companyName} onChange={(value) => update("companyName", value)} placeholder="Acme Logistics" />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Industry" value={form.industry} onChange={(value) => update("industry", value)} placeholder="Transportation" />
                <TextField label="Phone" value={form.companyPhone} onChange={(value) => update("companyPhone", value)} placeholder="(555) 010-1000" />
              </div>
              <TextField label="Website" value={form.website} onChange={(value) => update("website", value)} placeholder="https://example.com" />
              <TextAreaField label="Notes" value={form.companyNotes} onChange={(value) => update("companyNotes", value)} placeholder="Account context, source, or fit notes…" />
            </>
          )}

          {kind === "person" && (
            <>
              <TextField label="Full name *" value={form.fullName} onChange={(value) => update("fullName", value)} placeholder="Jordan Lee" />
              <OptionField label="Company" value={form.companyId} onChange={(value) => update("companyId", value)} options={companies.map((company) => ({ label: company.name, value: company.id }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Title" value={form.personTitle} onChange={(value) => update("personTitle", value)} placeholder="Operations Director" />
                <TextField label="Phone" value={form.personPhone} onChange={(value) => update("personPhone", value)} placeholder="(555) 010-1000" />
              </div>
              <TextField label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} placeholder="jordan@example.com" />
            </>
          )}

          {kind === "opportunity" && (
            <>
              <TextField label="Opportunity name *" value={form.opportunityName} onChange={(value) => update("opportunityName", value)} placeholder="Acme Workflow Rollout" />
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionField label="Company" value={form.companyId} onChange={(value) => update("companyId", value)} options={companies.map((company) => ({ label: company.name, value: company.id }))} />
                <OptionField label="Primary person" value={form.personId} onChange={(value) => update("personId", value)} options={people.map((person) => ({ label: person.full_name, value: person.id }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField label="Stage" value={form.stageKey} onChange={(value) => update("stageKey", value)} placeholder="discovery" />
                <TextField label="Value" type="number" value={form.valueAmount} onChange={(value) => update("valueAmount", value)} placeholder="12000" />
                <TextField label="Close date" type="date" value={form.expectedCloseDate} onChange={(value) => update("expectedCloseDate", value)} />
              </div>
              <TextField label="Next step" value={form.nextStep} onChange={(value) => update("nextStep", value)} placeholder="Schedule discovery call" />
            </>
          )}

          {kind === "task" && (
            <>
              <TextField label="Task title *" value={form.nextAction} onChange={(value) => update("nextAction", value)} placeholder="Follow up about timeline" />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Due" type="datetime-local" value={form.nextActionAt} onChange={(value) => update("nextActionAt", value)} />
                <OptionField label="Priority" value={form.priority} onChange={(value) => update("priority", value)} options={["low", "normal", "high", "urgent"].map((priority) => ({ label: priority, value: priority }))} />
              </div>
              <CrmContextFields form={form} update={update} companies={companies} people={people} opportunities={opportunities} />
            </>
          )}

          {kind === "note" && (
            <>
              <TextField label="Title" value={form.noteTitle} onChange={(value) => update("noteTitle", value)} placeholder="Discovery notes" />
              <TextAreaField label="Note *" value={form.noteBody} onChange={(value) => update("noteBody", value)} placeholder="What should the team remember?" rows={5} />
              <CrmContextFields form={form} update={update} companies={companies} people={people} opportunities={opportunities} />
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CrmContextFields({
  form,
  update,
  companies,
  people,
  opportunities,
}: {
  form: QuickAddForm;
  update: (field: keyof QuickAddForm, value: string) => void;
  companies: CompanyOption[];
  people: PersonOption[];
  opportunities: OpportunityOption[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <OptionField label="Company" value={form.companyId} onChange={(value) => update("companyId", value)} options={companies.map((company) => ({ label: company.name, value: company.id }))} />
      <OptionField label="Person" value={form.personId} onChange={(value) => update("personId", value)} options={people.map((person) => ({ label: person.full_name, value: person.id }))} />
      <OptionField label="Opportunity" value={form.opportunityId} onChange={(value) => update("opportunityId", value)} options={opportunities.map((opportunity) => ({ label: opportunity.name, value: opportunity.id }))} />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function OptionField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">None</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
