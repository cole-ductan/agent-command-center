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

export async function createStartOpportunity(input: StartOpportunityInput): Promise<string> {
  const db = supabase as unknown as { from: (table: string) => any };
  let companyId: string | null = null;
  let personId: string | null = null;

  if (input.companyName?.trim()) {
    const { data, error } = await db.from("companies").insert({
      tenant_id: input.tenantId,
      created_by: input.userId,
      owner_id: input.userId,
      name: input.companyName.trim(),
    }).select("id").single();
    if (error) throw error;
    companyId = data.id;
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

  return data.id;
}
