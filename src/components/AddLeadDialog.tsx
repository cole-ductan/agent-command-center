import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveTenant } from "@/hooks/useActiveTenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { LEAD_SOURCES } from "@/lib/leadSource";
import { formatPhone } from "@/lib/phone";

export function AddLeadDialog({
  trigger,
  onCreated,
  open: openProp,
  onOpenChange,
  defaultDate,
}: {
  trigger?: React.ReactNode;
  onCreated?: (eventId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: string;
}) {
  const { user } = useAuth();
  const { tenantId } = useActiveTenant();
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp! : openInternal;
  const setOpen = (v: boolean) => {
    if (!isControlled) setOpenInternal(v);
    onOpenChange?.(v);
  };
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [location, setLocation] = useState("");
  const [targetDate, setTargetDate] = useState(defaultDate ?? "");
  const [quantity, setQuantity] = useState("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [externalId, setExternalId] = useState("");
  const [notes, setNotes] = useState("");

  // Sync defaultDate when dialog opens
  useEffect(() => {
    if (open && defaultDate) setTargetDate(defaultDate);
  }, [open, defaultDate]);

  const reset = () => {
    setOrgName(""); setContactName(""); setContactEmail(""); setContactPhone("");
    setEventName(""); setLocation(""); setTargetDate(""); setQuantity(""); setLeadSource(""); setExternalId(""); setNotes("");
  };

  const submit = async () => {
    if (!user) return;
    if (!tenantId) { toast.error("No active workspace"); return; }
    if (!eventName.trim()) {
      toast.error("Lead name is required");
      return;
    }
    setSaving(true);
    try {
      let orgId: string | null = null;
      if (orgName.trim()) {
        const { data: org, error: oErr } = await supabase
          .from("organizations")
          .insert({ tenant_id: tenantId, user_id: user.id, name: orgName.trim() })
          .select().single();
        if (oErr) throw oErr;
        orgId = org.id;
      }

      let contactId: string | null = null;
      if (contactName.trim()) {
        const { data: c, error: cErr } = await supabase
          .from("contacts")
          .insert({
            tenant_id: tenantId,
            user_id: user.id,
            organization_id: orgId,
            name: contactName.trim(),
            email: contactEmail.trim() || null,
            phone: contactPhone.trim() || null,
          })
          .select().single();
        if (cErr) throw cErr;
        contactId = c.id;
      }

      const { data: ev, error: eErr } = await supabase
        .from("events")
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          organization_id: orgId,
          primary_contact_id: contactId,
          event_name: eventName.trim(),
          course: location.trim() || null,
          event_date: targetDate || null,
          player_count: quantity.trim() ? Number(quantity) : null,
          lead_source: leadSource || null,
          dixon_tournament_id: externalId.trim() || null,
          notes: notes.trim() || null,
          stage: "new_lead",
        })
        .select().single();
      if (eErr) throw eErr;

      toast.success("Lead added");
      reset();
      setOpen(false);
      onCreated?.(ev.id);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Add Lead</Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add Lead</DialogTitle>
          <DialogDescription>
            Create an account, primary contact, and lead record in one step.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="event">Lead name *</Label>
            <Input id="event" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Acme expansion opportunity" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="org">Account / organization</Label>
            <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Co." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="contact">Contact name</Label>
              <Input id="contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jordan Lee" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(formatPhone(e.target.value))} placeholder="(555) 010-1000" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@company.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="location">Location / context</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Region, branch, deal context…" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="date">Target date</Label>
              <Input id="date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="quantity">Quantity / size</Label>
              <Input id="quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Estimated size" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="source">Lead Source</Label>
              <Select value={leadSource} onValueChange={setLeadSource}>
                <SelectTrigger id="source"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="external-id">External ID</Label>
            <Input id="external-id" value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="CRM, import, or source ID" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything useful before the first call…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Add Lead"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
