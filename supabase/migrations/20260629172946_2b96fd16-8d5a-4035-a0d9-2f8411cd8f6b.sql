
-- ============= objections =============
CREATE TABLE public.objections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  trigger TEXT NOT NULL,
  response TEXT NOT NULL,
  tip TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objections TO authenticated;
GRANT ALL ON public.objections TO service_role;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "objections tenant read"    ON public.objections FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "objections tenant insert"  ON public.objections FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "objections tenant update"  ON public.objections FOR UPDATE TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid())) WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "objections tenant delete"  ON public.objections FOR DELETE TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER set_objections_updated_at BEFORE UPDATE ON public.objections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= training_documents =============
CREATE TABLE public.training_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  storage_path TEXT,
  external_url TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_documents TO authenticated;
GRANT ALL ON public.training_documents TO service_role;
ALTER TABLE public.training_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "training_documents tenant read"   ON public.training_documents FOR SELECT TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "training_documents tenant insert" ON public.training_documents FOR INSERT TO authenticated WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "training_documents tenant update" ON public.training_documents FOR UPDATE TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid())) WITH CHECK (public.is_tenant_member(tenant_id, auth.uid()));
CREATE POLICY "training_documents tenant delete" ON public.training_documents FOR DELETE TO authenticated USING (public.is_tenant_member(tenant_id, auth.uid()));
CREATE TRIGGER set_training_documents_updated_at BEFORE UPDATE ON public.training_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= command_center_templates =============
CREATE TABLE public.command_center_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  is_official BOOLEAN NOT NULL DEFAULT true,
  preview_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.command_center_templates TO authenticated;
GRANT ALL ON public.command_center_templates TO service_role;
ALTER TABLE public.command_center_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates read all"
  ON public.command_center_templates FOR SELECT TO authenticated USING (true);

CREATE TABLE public.template_payloads (
  template_id UUID PRIMARY KEY REFERENCES public.command_center_templates(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.template_payloads TO authenticated;
GRANT ALL ON public.template_payloads TO service_role;
ALTER TABLE public.template_payloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template payloads read all"
  ON public.template_payloads FOR SELECT TO authenticated USING (true);

-- ============= apply_template function =============
CREATE OR REPLACE FUNCTION public.apply_template(p_tenant_id UUID, p_template_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB;
  v_user UUID := auth.uid();
  v_owner UUID;
  v_offers INT := 0;
  v_emails INT := 0;
  v_scripts INT := 0;
  v_objections INT := 0;
  v_presets INT := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_tenant_member(p_tenant_id, v_user) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  SELECT created_by INTO v_owner FROM public.tenants WHERE id = p_tenant_id;

  SELECT content INTO v_payload FROM public.template_payloads WHERE template_id = p_template_id;
  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Template payload not found';
  END IF;

  -- Offers
  INSERT INTO public.offers (tenant_id, user_id, slug, name, type, cost, when_to_introduce, details, sort_order)
  SELECT p_tenant_id, COALESCE(v_owner, v_user),
         x->>'slug', x->>'name', x->>'type', x->>'cost', x->>'when_to_introduce', x->>'details',
         COALESCE((x->>'sort_order')::int, 0)
  FROM jsonb_array_elements(COALESCE(v_payload->'offers','[]'::jsonb)) AS x
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_offers = ROW_COUNT;

  -- Email templates
  INSERT INTO public.email_templates (tenant_id, user_id, slug, name, subject, body)
  SELECT p_tenant_id, COALESCE(v_owner, v_user),
         x->>'slug', x->>'name', x->>'subject', x->>'body'
  FROM jsonb_array_elements(COALESCE(v_payload->'email_templates','[]'::jsonb)) AS x
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_emails = ROW_COUNT;

  -- Script sections
  INSERT INTO public.script_sections (tenant_id, user_id, slug, title, body, sort_order)
  SELECT p_tenant_id, COALESCE(v_owner, v_user),
         x->>'slug', x->>'title', x->>'body', COALESCE((x->>'sort_order')::int, 0)
  FROM jsonb_array_elements(COALESCE(v_payload->'script_sections','[]'::jsonb)) AS x
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_scripts = ROW_COUNT;

  -- Objections
  INSERT INTO public.objections (tenant_id, user_id, slug, trigger, response, tip, sort_order)
  SELECT p_tenant_id, COALESCE(v_owner, v_user),
         x->>'slug', x->>'trigger', x->>'response', x->>'tip',
         COALESCE((x->>'sort_order')::int, 0)
  FROM jsonb_array_elements(COALESCE(v_payload->'objections','[]'::jsonb)) AS x
  ON CONFLICT (tenant_id, slug) DO NOTHING;
  GET DIAGNOSTICS v_objections = ROW_COUNT;

  -- Next action presets (optional)
  INSERT INTO public.next_action_presets (tenant_id, user_id, slug, label, offset_days, sort_order)
  SELECT p_tenant_id, COALESCE(v_owner, v_user),
         x->>'slug', x->>'label',
         COALESCE((x->>'offset_days')::int, 0),
         COALESCE((x->>'sort_order')::int, 0)
  FROM jsonb_array_elements(COALESCE(v_payload->'next_action_presets','[]'::jsonb)) AS x
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_presets = ROW_COUNT;

  RETURN jsonb_build_object(
    'offers', v_offers, 'email_templates', v_emails,
    'script_sections', v_scripts, 'objections', v_objections,
    'next_action_presets', v_presets
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.apply_template(UUID, UUID) TO authenticated;

-- ============= seed: Blank + Dixon templates =============
INSERT INTO public.command_center_templates (slug, name, description, industry, is_official)
VALUES
  ('blank', 'Blank Command Center', 'Start from scratch and build your own scripts, offers and emails.', NULL, true),
  ('dixon-golf-charity', 'Dixon Golf Charity Events', 'The full Dixon Golf playbook — Amateur Endorsement, Par 3/5 challenges, CGT, and a complete call script for charity golf tournaments.', 'Fundraising / Golf', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.template_payloads (template_id, content)
SELECT id, '{}'::jsonb FROM public.command_center_templates WHERE slug = 'blank'
ON CONFLICT (template_id) DO NOTHING;

INSERT INTO public.template_payloads (template_id, content)
SELECT id, jsonb_build_object(
  'offers', jsonb_build_array(
    jsonb_build_object('slug','amateur_endorsement','name','Amateur Endorsement','type','Free prize certificate','cost','Free','when_to_introduce','Immediately after Discovery — always','details', E'Free prize certificate the tournament gives to one player.\n• Dixon Bamboo Hat\n• Sleeve of Dixon Earth golf balls\n• Zinc alloy divot tool & ball marker\n• 50% off Dixon Golf gear for 1 year\n• Possible social media spotlight\nStated value: $50. Redeem at dixongolf.com/amateur.','sort_order',1),
    jsonb_build_object('slug','dixon_challenge','name','Dixon Challenge (Par 3)','type','On-course fundraising game','cost','Free','when_to_introduce','After Amateur Endorsement — always','details', E'Dixon rep runs a fun game on a par 3. Free gift for every player. Donors get $150+ in prizes ($40 off Dixon, Golf Digest membership). Free Fiesta Bowl HIO included. 30% of gross donations mailed back as a check.','sort_order',2),
    jsonb_build_object('slug','aurelius_challenge','name','Aurelius Challenge (Par 5)','type','On-course fundraising game','cost','Free','when_to_introduce','Pitched together with Dixon Challenge','details', E'Dixon rep runs a fun game on a par 5. Charity gets a custom driver OR $500 Zovatti watch. Donors get $250+ in prizes ($100 off a club). 30% of gross donations mailed back as a check.','sort_order',3),
    jsonb_build_object('slug','fiesta_bowl','name','Fiesta Bowl Hole-in-One','type','Bonus contest with Dixon Challenge','cost','Free','when_to_introduce','Mentioned during Dixon Challenge pitch','details', E'Bonus included with Dixon Challenge. Holes-in-one earn direct access to the final round of the Million Dollar Fiesta Bowl Shootout.','sort_order',4),
    jsonb_build_object('slug','legend_shootout','name','LEGEND Shootout','type','Raffle-based hole-in-one contest','cost','Free','when_to_introduce','Situational — large or high-value events','details', E'Raffle-style hole-in-one contest layered on top of standard offers for high-volume tournaments.','sort_order',5),
    jsonb_build_object('slug','cgt','name','Charity Golf Today (CGT)','type','Tournament management platform','cost','Free (5% + 2.5% on payments)','when_to_introduce','After booking — always','details', E'Free tournament platform: event website, registrations, payments, pairings, sponsor pages, live scoring. Only fees are payment processing (5% + 2.5%). Pitch when they mention registration, payments, sponsors, or logistics.','sort_order',6),
    jsonb_build_object('slug','custom_products','name','Custom Products','type','Branded tournament merchandise','cost','Wholesale pricing','when_to_introduce','After CGT walkthrough','details', E'Wholesale store: logoed balls, polos, towels, divot tools, more.\n• Buy 1 → free $1000 HIO Privilege Travel Card\n• Buy 2 → free tote for all players\n• Buy 3 lifetime HIO prizes → 4th free','sort_order',7),
    jsonb_build_object('slug','sponsorship_packages','name','Sponsorship Packages','type','Ready-made sponsor tiers','cost','Wholesale pricing','when_to_introduce','During CGT walkthrough — if they sell sponsorships','details', E'Pre-built sponsor tier templates with custom-branded products.','sort_order',8),
    jsonb_build_object('slug','hole_in_one_insurance','name','Hole-in-One Insurance','type','Prize insurance product','cost','Wholesale pricing','when_to_introduce','After CGT — if they want big prizes','details', E'Insurance product allowing the event to advertise high-value HIO prizes.','sort_order',9),
    jsonb_build_object('slug','consulting','name','Consulting Support','type','TC as tournament advisor','cost','Free','when_to_introduce','End of call — always','details', E'Position yourself as their advisor. "I work with hundreds of tournaments, my company works with tens of thousands."','sort_order',10),
    jsonb_build_object('slug','auction_referral','name','Auction Referral','type','Virtual fundraising partner referral','cost','Free','when_to_introduce','Situational — canceled, far out, or declined games','details', E'Referral to virtual fundraising partner. Use when the call is going cold or they declined the on-course games.','sort_order',11)
  ),
  'email_templates', jsonb_build_array(
    jsonb_build_object('slug','first_contact','name','First Contact — Amateur Endorsement','subject','Dixon Advantages','body', E'Hi {{contact_name}},\n\nHere is a brief overview of options that can be helpful for your tournament. You can choose ANY or ALL of them. I will discuss them in more detail on our phone call.\n\nFREE — Amateur Endorsement Package\nGive this prize to one of your players (balls, hat, divot tool, 50% discount at Dixon Golf for a year).\n\nFREE — On-Course Games\nWe staff two holes with fun games and give away prizes while providing additional fundraising.\n\nFREE — Tournament Planning Software\nBest tournament planning software in the industry at no charge.\n\nFREE — Educational Video Series\nBuilt from 60,000 tournaments worth of experience.\n\nOnline Store with Tournament Products\nPrizes, custom logo products, hole-in-one insurance, sponsor items at wholesale.\n\nFREE — Organizational Tools\nCommittee, registrations, pairings, check-in, live scoring.\n\nWebsite for Your Tournament\nA site just for your tournament that accepts payments.\n\nFREE — Expert Consulting\nI work with hundreds of golf tournaments. Happy to share what I''ve learned.\n\nTalk soon,\n{{your_name}}'),
    jsonb_build_object('slug','follow_up','name','Call Follow-Up (Booked)','subject','Dixon Golf at {{event_name}} — confirmation','body', E'{{contact_name}},\n\nWe are excited about Dixon Golf being a part of your golf event at {{course}} on {{event_date}}. We will provide the staff, gear, and all the gifts/prizes to make sure our support makes your event a success.\n\n— {{your_name}}'),
    jsonb_build_object('slug','no_answer','name','No Answer / Callback','subject','Tried to reach you — {{event_name}}','body', E'Hi {{contact_name}},\n\nTried calling about your {{event_name}} tournament — wanted to talk through a free sponsorship opportunity. I''ll try again {{next_action_at}}, or feel free to call me at [YOUR PHONE].\n\n— {{your_name}}'),
    jsonb_build_object('slug','cgt_intro','name','CGT Intro','subject','Your free tournament platform — {{event_name}}','body', E'{{contact_name}},\n\nPer our call, here''s the link to set up your free Charity Golf Today site for {{event_name}}: {{cgt_url}}\n\nIt includes registrations, payments, sponsors, pairings, and a live scoring board — all at no cost (only payment processing fees apply). Let me know if you want to do a quick walkthrough together.\n\n— {{your_name}}')
  ),
  'script_sections', jsonb_build_array(
    jsonb_build_object('slug','voicemail','title','Step 1 — Voicemail','sort_order',1,'body', E'DO NOT mention "Dixon Golf" in the voicemail.\n\n"Hi, this is [YOUR NAME]. I was calling about your [TOURNAMENT NAME] golf tournament. I was interested in donating an item to the raffle or sponsoring your event, but wanted to hear a little more about it. If you could give me a call back that would be great. My number is [YOUR PHONE]."\n\nWhy: They call back out of curiosity, not because they think it''s a corporate sales call.'),
    jsonb_build_object('slug','intro','title','Step 2 — Live Introduction','sort_order',2,'body','"Hi, this is [YOUR NAME] from Dixon Golf. We sponsor a number of charity golf events as part of our marketing. We heard about your upcoming event and I wanted to see if it''s something we want to sponsor. Could you tell me a bit about your event?"'),
    jsonb_build_object('slug','questions','title','Step 3 — Ask Questions (MOST IMPORTANT)','sort_order',3,'body', E'Let them talk. The more they talk, the more they like you.\n\nKey questions:\n• Specific use for the funds, or general?\n• How many years have you done it?\n• How long have you been involved?\n• Date and time of the tournament?\n• Which golf course?\n• Entry fee?\n• How many players?\n• Current sponsorships?\n• Registration / payment process?\n• Player gift budget?\n• Hardest part of running the event?\n• Overall goal this year — $X raised, X golfers, etc.?'),
    jsonb_build_object('slug','amateur_endorsement','title','Step 4 — Offer Free Stuff (Amateur Endorsement)','sort_order',4,'body', E'"Great, we can certainly support what you are doing by sending you an Amateur Endorsement. The Amateur Endorsement is a prize for you to give to a player at your event. That individual will be sponsored by Dixon Golf, get a free hat, free golf balls, free divot tool, and discounts for a whole year — a $50 value.\n\nWhat is your email address so that I can email you the prize redemption certificate?"'),
    jsonb_build_object('slug','on_course_games','title','Step 5 — On-Course Games','sort_order',5,'body', E'"We''ll send two reps. One sets up a fun game on a par 3, the other on a par 5."\n\n100% free of charge. Reps accept $10–$25 donations on course. We mail you a check for 30% of gross.'),
    jsonb_build_object('slug','cgt','title','Step 6 — CGT Platform Pitch','sort_order',6,'body', E'"We also give you our tournament management platform — Charity Golf Today — completely free. Event website, registrations, payments, sponsor pages, pairings, live scoring. Only cost is 5% + 2.5% on payments processed."'),
    jsonb_build_object('slug','custom_products','title','Step 7 — Custom Products','sort_order',7,'body', E'"If you have any budget for player gifts or sponsor packages, we have a wholesale store with logoed balls, polos, towels, divot tools — and incentives."'),
    jsonb_build_object('slug','close','title','Step 8 — Close / Next Step','sort_order',8,'body', E'Lock in commitment: confirm Par 3 / Par 5 booking, confirm CGT created, get check payable info, set Next Follow-Up, send the follow-up email before you hang up.')
  ),
  'objections', jsonb_build_array(
    jsonb_build_object('slug','whats_the_catch','sort_order',1,'trigger','What''s the catch? / Sounds too good to be true.','response','Honest answer — there''s no catch on the free pieces. We''re a marketing-driven company. We get in front of golfers at your event, you get prizes, fundraising help, and 30% of donations back. The only thing we sell is the optional custom products at wholesale, and only if you want them.'),
    jsonb_build_object('slug','pace_of_play','sort_order',2,'trigger','I''m worried about pace of play.','response','Totally fair concern. Our reps are trained to keep groups moving — the games are fast (one shot), and we set up to the side of the tee so we never block play. We''ve run this on 60,000+ tournaments without slowing rounds down.'),
    jsonb_build_object('slug','committee','sort_order',3,'trigger','I have to check with my committee.','response','Absolutely — let''s get you the info to bring to them. I''ll send the call email now with everything in writing, and let''s pencil in a callback right after your committee meeting so we can lock the date.','tip','Always set the follow-up date on the call. Do not "wait to hear back."'),
    jsonb_build_object('slug','we_have_sponsors','sort_order',4,'trigger','We already have sponsors / hole sponsors.','response','Great — this isn''t a hole sponsorship, it''s a fundraising activation. Our reps fund themselves through optional donations and we mail you a check. It stacks on top of what your sponsors are already doing.'),
    jsonb_build_object('slug','send_info','sort_order',5,'trigger','Just send me some info and I''ll review it.','response','Happy to. I''ll send the Amateur Endorsement and an overview right now — what''s the best email? While I have you, can I ask one quick question so I send the right info.','tip','Never accept "send me info" as the end of the call. Re-open Discovery.'),
    jsonb_build_object('slug','not_interested','sort_order',6,'trigger','Not interested.','response','No problem at all — can I ask, is it the timing, the games themselves, or just bandwidth right now? That way I know whether to reach back out next year.','tip','Their answer tells you whether to mark Closed Lost or Follow-Up Next Cycle.'),
    jsonb_build_object('slug','small_event','sort_order',7,'trigger','Our event is too small for this.','response','There''s no minimum — we work with 40-player events all the way up to 300+. The math actually works better for smaller tournaments because the per-player attention is higher.')
  )
)
FROM public.command_center_templates WHERE slug = 'dixon-golf-charity'
ON CONFLICT (template_id) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
