/**
 * Generic Live Call Pipeline
 *
 * RepPilot blank workspaces must not inherit Dixon Golf-specific language.
 * This file now defines the neutral default guided-call workflow. Industry or
 * company-specific flows should be loaded from tenant/template data in the next
 * workflow-config PRs.
 */

export type CaptureField =
  // event fields kept for compatibility with the existing event schema
  | "event_name"
  | "course"
  | "event_date"
  | "event_time"
  | "player_count"
  | "entry_fee"
  | "funds_use"
  | "pain_points"
  | "sponsorship_details"
  | "registration_method"
  | "player_gift_budget"
  | "event_website"
  | "amateur_endorsement_sent"
  | "interest_par3"
  | "interest_par5"
  | "par3_booked"
  | "par5_booked"
  | "check_payable_to"
  | "check_mail_to"
  | "check_address"
  | "cgt_created"
  | "cgt_url"
  | "custom_products_sold"
  | "auction_referred"
  | "where_left_off"
  // contact fields
  | "contact_name"
  | "contact_email"
  | "contact_phone";

export type DecisionBranch = {
  label: string;
  /** Slug of the step to jump to, or "wrap" for end-of-call. */
  goto: string;
  /** Optional event patch applied when this branch is chosen. */
  patch?: Record<string, unknown>;
  variant?: "primary" | "default" | "muted";
};

export type PipelineStep = {
  slug: string;
  number: number | "PRE";
  emoji: string;
  title: string;
  subtitle?: string;
  scriptLines?: string[];
  checklist?: string[];
  capture?: CaptureField[];
  decisions?: DecisionBranch[];
  callout?: { tone: "info" | "warn" | "critical"; text: string };
};

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    slug: "pre_call",
    number: "PRE",
    emoji: "☎️",
    title: "Pre-Call - Prepare",
    subtitle: "Review the lead, choose the purpose of the call, and decide the next best question.",
    callout: {
      tone: "info",
      text: "Blank workspaces now use this generic workflow. Company-specific scripts belong in tenant/template configuration.",
    },
    checklist: [
      "Review the latest notes and open tasks",
      "Confirm the contact name, company, and call objective",
      "Prepare the strongest reason for calling",
      "Decide what outcome would make this call successful",
    ],
    decisions: [
      { label: "Dialing now - no answer", goto: "voicemail", variant: "muted" },
      { label: "Dialing now - they answered", goto: "intro", variant: "primary" },
    ],
  },
  {
    slug: "voicemail",
    number: 1,
    emoji: "📵",
    title: "Step 1 - Voicemail",
    subtitle: "Leave a short, useful reason to call back.",
    scriptLines: [
      "Hi, this is [YOUR NAME]. I was reaching out about [COMPANY/OPPORTUNITY]. I had a quick question and wanted to see if it made sense to connect. You can call me back at [PHONE]. Again, this is [YOUR NAME] at [PHONE].",
    ],
    checklist: [
      "Keep the voicemail under 25 seconds",
      "Do not explain the full offer in the voicemail",
      "Log the outcome and move to the next lead",
    ],
    decisions: [
      { label: "Mark voicemail and wrap", goto: "wrap", patch: { stage: "left_voicemail" }, variant: "primary" },
    ],
  },
  {
    slug: "intro",
    number: 2,
    emoji: "🟢",
    title: "Step 2 - Live Introduction",
    subtitle: "Set context, earn permission, and open the conversation.",
    scriptLines: [
      "Hi, this is [YOUR NAME]. I am calling about [COMPANY/OPPORTUNITY]. I know I am catching you in the middle of the day, so I will be brief. The reason I am calling is [RELEVANT REASON]. Would it be fair to ask one quick question?",
    ],
    decisions: [
      { label: "They engage - Discovery", goto: "discovery", variant: "primary" },
      { label: "They are busy - Schedule follow-up", goto: "follow_up" },
      { label: "They push back - Objections", goto: "objections" },
    ],
  },
  {
    slug: "discovery",
    number: 3,
    emoji: "🔍",
    title: "Step 3 - Discovery",
    subtitle: "Find the current state, pain, priority, and buying context.",
    callout: {
      tone: "info",
      text: "Stay curious. The workflow should capture what matters to this workspace, not force one industry playbook.",
    },
    scriptLines: [
      "Can you walk me through how you are handling this today?",
      "What is working well, and what is creating friction?",
      "What would need to change for this to become a priority?",
    ],
    decisions: [
      { label: "Need is clear - Qualify", goto: "qualify", variant: "primary" },
      { label: "Need is unclear - Keep discovering", goto: "discovery" },
      { label: "Objection raised", goto: "objections" },
    ],
  },
  {
    slug: "qualify",
    number: 4,
    emoji: "🎯",
    title: "Step 4 - Qualify",
    subtitle: "Confirm fit, urgency, authority, and next-step potential.",
    scriptLines: [
      "Who else is usually involved when you evaluate something like this?",
      "Is there a timeline you are working against, or is this more exploratory?",
      "What would make this worth moving forward on?",
    ],
    decisions: [
      { label: "Qualified - Present value", goto: "value", variant: "primary", patch: { stage: "contacted" } },
      { label: "Not qualified now - Nurture", goto: "nurture" },
      { label: "Needs another stakeholder - Follow-up", goto: "follow_up" },
    ],
  },
  {
    slug: "value",
    number: 5,
    emoji: "💡",
    title: "Step 5 - Value Positioning",
    subtitle: "Connect the offer to the pain they already confirmed.",
    scriptLines: [
      "Based on what you shared, the main issue sounds like [PAIN]. The way we usually help is by [OUTCOME], so your team can [BENEFIT].",
      "The reason this tends to work is [PROOF/MECHANISM].",
    ],
    decisions: [
      { label: "They want details - Demo or explanation", goto: "demo", variant: "primary" },
      { label: "They ask for pricing/proposal", goto: "proposal" },
      { label: "They object", goto: "objections" },
    ],
  },
  {
    slug: "demo",
    number: 6,
    emoji: "🧪",
    title: "Step 6 - Show or Explain",
    subtitle: "Demonstrate only the pieces tied to their confirmed needs.",
    scriptLines: [
      "Let me show you the part that connects to what you mentioned earlier.",
      "Here is what changes before and after this is in place.",
    ],
    checklist: [
      "Only show the feature, offer, or proof that supports the known pain",
      "Pause and ask what seems useful or unclear",
      "Do not over-demo",
    ],
    decisions: [
      { label: "Clear fit - Proposal", goto: "proposal", variant: "primary", patch: { stage: "pitch_delivered" } },
      { label: "Needs more information", goto: "follow_up" },
      { label: "Objection raised", goto: "objections" },
    ],
  },
  {
    slug: "objections",
    number: 7,
    emoji: "⚠️",
    title: "Step 7 - Handle Objections",
    subtitle: "Clarify the concern before responding.",
    scriptLines: [
      "That makes sense. When you say [OBJECTION], is the concern mainly about timing, fit, cost, trust, or something else?",
      "If we could solve that concern, would it make sense to keep talking?",
    ],
    checklist: [
      "Acknowledge first",
      "Clarify the real objection",
      "Respond briefly",
      "Ask for the next step again",
    ],
    decisions: [
      { label: "Resolved - Continue", goto: "proposal", variant: "primary" },
      { label: "Needs follow-up", goto: "follow_up" },
      { label: "Not a fit", goto: "nurture" },
    ],
  },
  {
    slug: "proposal",
    number: 8,
    emoji: "📄",
    title: "Step 8 - Proposal or Recommendation",
    subtitle: "Summarize fit and make the next step concrete.",
    scriptLines: [
      "Here is what I recommend based on what you told me: [RECOMMENDATION].",
      "The next step would be [NEXT STEP]. Does that line up with what you were expecting?",
    ],
    decisions: [
      { label: "Proposal sent", goto: "close", variant: "primary", patch: { stage: "proposal_sent" } },
      { label: "Needs more discovery", goto: "discovery" },
      { label: "Schedule review", goto: "follow_up" },
    ],
  },
  {
    slug: "close",
    number: 9,
    emoji: "✅",
    title: "Step 9 - Close or Commit",
    subtitle: "Ask for a clear decision or a clear next commitment.",
    scriptLines: [
      "Based on everything we covered, does it make sense to move forward?",
      "If yes, I can help get the next step started now. If not, what would need to be true before this makes sense?",
    ],
    decisions: [
      { label: "Closed won", goto: "wrap", variant: "primary", patch: { stage: "closed_won" } },
      { label: "Decision later", goto: "follow_up" },
      { label: "Closed lost", goto: "wrap", patch: { stage: "closed_lost" } },
    ],
  },
  {
    slug: "follow_up",
    number: 10,
    emoji: "📅",
    title: "Step 10 - Schedule Follow-Up",
    subtitle: "Turn vague interest into a dated next action.",
    scriptLines: [
      "What is the best next step from here?",
      "When should I follow up, and what should I bring back to you at that point?",
    ],
    checklist: [
      "Pick a specific next action",
      "Set a specific follow-up date and time",
      "Write where the conversation left off",
    ],
    decisions: [
      { label: "Follow-up scheduled", goto: "wrap", variant: "primary", patch: { stage: "follow_up_scheduled" } },
    ],
  },
  {
    slug: "nurture",
    number: 11,
    emoji: "🌱",
    title: "Step 11 - Nurture or Recycle",
    subtitle: "Keep future-fit leads clean without clogging the active queue.",
    scriptLines: [
      "No problem. It sounds like now may not be the right time. Would it be useful if I checked back around [TIMEFRAME]?",
    ],
    decisions: [
      { label: "Recycle for later", goto: "follow_up", variant: "primary" },
      { label: "Close lost", goto: "wrap", patch: { stage: "closed_lost" } },
    ],
  },
  {
    slug: "handoff",
    number: 12,
    emoji: "🤝",
    title: "Step 12 - Handoff or Fulfillment",
    subtitle: "Capture what another person or system needs to execute next.",
    scriptLines: [
      "Before I let you go, I want to make sure the next person has the full context. The key items are [SUMMARY], [OWNER], and [DATE].",
    ],
    checklist: [
      "Confirm owner",
      "Confirm deadline",
      "Confirm required assets or information",
    ],
    decisions: [
      { label: "Handoff complete", goto: "wrap", variant: "primary" },
    ],
  },
  {
    slug: "wrap",
    number: 13,
    emoji: "🧾",
    title: "Step 13 - Wrap-Up Checklist",
    subtitle: "Log the call so the next action is obvious.",
    callout: {
      tone: "info",
      text: "A good CRM record should answer: what happened, why it matters, and what happens next.",
    },
    checklist: [
      "Outcome is set correctly",
      "Summary explains what happened",
      "Where-we-left-off is clear",
      "Follow-up is scheduled if there is a next step",
      "Relevant templates, notes, and resources are attached or referenced",
    ],
    decisions: [
      { label: "Ready to log call", goto: "wrap", variant: "primary" },
    ],
  },
];

export const STEP_BY_SLUG = Object.fromEntries(PIPELINE_STEPS.map((s) => [s.slug, s]));

/* ---------------- Generic objection quick-reference ---------------- */

export type Objection = {
  slug: string;
  trigger: string;
  response: string;
  tip?: string;
};

export const OBJECTIONS: Objection[] = [
  {
    slug: "send_info",
    trigger: "Just send me information.",
    response:
      "Absolutely. I can send the right information, but I do not want to send a generic dump. Can I ask one quick question so I know what is most relevant?",
    tip: "Use the request for info as a bridge back into discovery.",
  },
  {
    slug: "too_busy",
    trigger: "I am too busy right now.",
    response:
      "Totally fair. Would it be better to schedule a specific time, or should I send a short summary and follow up after you have had a chance to look?",
    tip: "Busy is usually a scheduling objection, not a rejection.",
  },
  {
    slug: "not_interested",
    trigger: "Not interested.",
    response:
      "No problem. So I do not keep bothering you with the wrong thing, is that because the timing is off, the problem is not a priority, or this just is not a fit?",
    tip: "Their answer tells you whether to recycle, nurture, or close lost.",
  },
  {
    slug: "already_have_solution",
    trigger: "We already have something for this.",
    response:
      "That makes sense. Most teams I talk to do. What are you using now, and what do you wish it handled better?",
  },
  {
    slug: "price_concern",
    trigger: "Sounds expensive / we do not have budget.",
    response:
      "Fair concern. Before talking price, it probably makes sense to confirm whether this is even solving a meaningful enough problem. What is the cost of leaving this the way it is?",
  },
  {
    slug: "need_approval",
    trigger: "I need to check with someone else.",
    response:
      "Of course. Who else should be involved, and what would they care about most when reviewing this?",
    tip: "Turn hidden decision makers into a clear next step.",
  },
];
