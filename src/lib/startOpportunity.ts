import { supabase } from "@/integrations/supabase/client";

export type StartOpportunityInput = {
  tenantId: string;
  userId: string;
  opportunityName: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  targetDate?: string;
  estimatedValue?: number | null;
  notes?: string;
};

export type StartOpportunityResult = {
  opportunityId: string;
  legacyEventId: string;
};

export async function createStartOpportunity(input: StartOpportunityInput): Promise<StartOpportunityResult> {
  const db = supabase as unknown as { from: (table: string) => any };
  let companyId: string | null = null;
  let personId: string | null = null;
  let legacyOrgId: string | null = null;
  let legacyContactId: string | null = null;

  if (input.companyName?.trim()) {
    const { data, error } = await db.from("companies").insert({
      tenant_id: input.tenantId,
      created_by: input.userId,
      owner_id: input.userId,
      name: input.companyName.trim(),
    }).select("id").single();
    if (error) throw error;
    companyId = data.id;

    const { data: legacyOrg, error: legacyOrgError } = await db.from("organizations").insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      name: input.companyName.trim(),
    }).select("id").single();
    if (legacyOrgError) throw legacyOrgError;
    legacyOrgId = legacyOrg.id;
  }

  if (input.contactName?.trim()) {
    const { data, error } = await db.from("people").insert({
      tenant_id: input.tenantId,
      company_id: companyId,
      created_by: input.userId,
      owner_id: input.userId,
      full_name: input.contactName.trim(),
      email: input.contactEmail?.trim() || null,
      phone: input.contactPhone?.trim() || null,
    }).select("id").single();
    if (error) throw error;
    personId = data.id;

    const { data: legacyContact, error: legacyContactError } = await db.from("contacts").insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      organization_id: legacyOrgId,
      name: input.contactName.trim(),
      email: input.contactEmail?.trim() || null,
      phone: input.contactPhone?.trim() || null,
    }).select("id").single();
    if (legacyContactError) throw legacyContactError;
    legacyContactId = legacyContact.id;
  }

  const { data, error } = await db.from("opportunities").insert({
    tenant_id: input.tenantId,
    company_id: companyId,
    primary_person_id: personId,
    created_by: input.userId,
    owner_id: input.userId,
    name: input.opportunityName.trim(),
    stage_key: "new",
    status: "open",
    value_amount: input.estimatedValue ?? null,
    expected_close_date: input.targetDate || null,
    next_step: "Start call",
    description: input.notes?.trim() || null,
  }).select("id").single();
  if (error) throw error;

  if (personId && data?.id) {
    const { error: linkError } = await db.from("opportunity_people").insert({
      tenant_id: input.tenantId,
      opportunity_id: data.id,
      person_id: personId,
      role: "Primary contact",
      is_primary: true,
    });
    if (linkError) throw linkError;
  }

  const { data: legacyEvent, error: legacyEventError } = await db.from("events").insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    organization_id: legacyOrgId,
    primary_contact_id: legacyContactId,
    event_name: input.opportunityName.trim(),
    event_date: input.targetDate || null,
    notes: [input.notes?.trim(), data?.id ? `Core opportunity: ${data.id}` : null].filter(Boolean).join("\n") || null,
    stage: "new_lead",
  }).select("id").single();
  if (legacyEventError) throw legacyEventError;

  return {
    opportunityId: data.id,
    legacyEventId: legacyEvent.id,
  };
}
