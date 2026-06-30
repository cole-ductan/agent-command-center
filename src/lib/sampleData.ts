import { supabase } from "@/integrations/supabase/client";

/**
 * Seeds generic SaaS-style sample CRM rows into a tenant for demo/onboarding.
 * Idempotent-ish: skips if the tenant already has 3+ opportunities.
 *
 * Vocabulary is intentionally generic (companies, contacts, opportunities)
 * so any sales team can recognize the shape — industry-specific starter
 * content comes from the command_center_templates system.
 */
export async function seedSampleData(tenantId: string, userId: string) {
  const existing = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if ((existing.count ?? 0) >= 3) return { skipped: true as const };

  const orgs = [
    { name: "Acme Corp", cause: "Enterprise software buyer" },
    { name: "Northwind Trading", cause: "Mid-market expansion" },
    { name: "Globex Industries", cause: "New logo opportunity" },
    { name: "Initech Systems", cause: "Renewal + upsell" },
    { name: "Umbrella Co.", cause: "Inbound demo request" },
    { name: "Hooli Labs", cause: "Referral from existing customer" },
  ];

  const { data: orgRows, error: orgErr } = await supabase
    .from("organizations")
    .insert(orgs.map((o) => ({ ...o, tenant_id: tenantId, user_id: userId })))
    .select();
  if (orgErr) throw orgErr;

  const contacts = orgRows!.map((o, i) => ({
    tenant_id: tenantId,
    user_id: userId,
    organization_id: o.id,
    name: ["Sarah Mitchell", "Tom Reynolds", "Maria Lopez", "James Chen", "Patricia Hill", "Derek Walters"][i],
    email: `contact${i + 1}@example.com`,
    phone: `(555) 010-${1000 + i}`,
    role: ["VP Sales", "Operations Lead", "Procurement", "CEO", "Office Manager", "Team Lead"][i],
  }));
  const { data: contactRows, error: cErr } = await supabase.from("contacts").insert(contacts).select();
  if (cErr) throw cErr;

  const today = new Date();
  const inDays = (d: number) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10);

  const events = [
    { idx: 0, name: "Acme — Annual Contract",         stage: "new_lead",            location: "Remote",         days: 60, hot: false, where_left_off: "Initial cold call — left voicemail." },
    { idx: 1, name: "Northwind — Pilot Rollout",      stage: "contacted",           location: "Chicago, IL",    days: 45, hot: true,  where_left_off: "Pitched product, awaiting email reply." },
    { idx: 2, name: "Globex — Platform Evaluation",   stage: "pitch_delivered",     location: "Austin, TX",     days: 30, hot: true,  where_left_off: "Demo went well. Wants to confirm dates with team." },
    { idx: 3, name: "Initech — Renewal + Upsell",     stage: "challenges_booked",   location: "Remote",         days: 21, hot: false, where_left_off: "Demo booked. Need to send walkthrough." },
    { idx: 4, name: "Umbrella — New Account Setup",   stage: "cgt_created",         location: "Denver, CO",     days: 14, hot: false, where_left_off: "Account set up. Discussing expansion next." },
    { idx: 5, name: "Hooli — Q4 Proposal",            stage: "follow_up_scheduled", location: "San Francisco",  days: 7,  hot: true,  where_left_off: "Scheduled follow-up to confirm order." },
  ];

  const eventInserts = events.map((e) => ({
    tenant_id: tenantId,
    user_id: userId,
    organization_id: orgRows![e.idx].id,
    primary_contact_id: contactRows![e.idx].id,
    event_name: e.name,
    event_date: inDays(e.days),
    course: e.location,
    stage: e.stage as any,
    hot_lead: e.hot,
    where_left_off: e.where_left_off,
    player_count: 10 + e.idx * 5,
    entry_fee: 500 + e.idx * 250,
    last_contact_at: new Date().toISOString(),
  }));

  const { data: eventRows, error: evErr } = await supabase.from("events").insert(eventInserts).select();
  if (evErr) throw evErr;

  const tasks = [
    { event_id: eventRows![0].id, action: "Try call again — left VM yesterday", offsetHours: -18, priority: "high" },
    { event_id: eventRows![1].id, action: "Confirm welcome email received", offsetHours: 4, priority: "normal" },
    { event_id: eventRows![2].id, action: "Lock in next-step dates", offsetHours: 28, priority: "high" },
    { event_id: eventRows![3].id, action: "Send walkthrough", offsetHours: 50, priority: "normal" },
    { event_id: eventRows![5].id, action: "Confirm order quantities", offsetHours: 2, priority: "urgent" },
  ];
  const taskInserts = tasks.map((t) => ({
    tenant_id: tenantId,
    user_id: userId,
    event_id: t.event_id,
    next_action: t.action,
    next_action_at: new Date(today.getTime() + t.offsetHours * 3600000).toISOString(),
    priority: t.priority as any,
  }));
  await supabase.from("tasks").insert(taskInserts);

  return { skipped: false as const, count: events.length };
}
