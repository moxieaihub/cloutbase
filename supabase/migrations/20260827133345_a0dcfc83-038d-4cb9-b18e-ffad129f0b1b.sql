-- at-risk flag + per-clipper daily limit
ALTER TABLE public.campaign_slots ADD COLUMN IF NOT EXISTS at_risk boolean NOT NULL DEFAULT false;
ALTER TABLE public.campaign_slots ADD COLUMN IF NOT EXISTS released_at timestamptz;
ALTER TABLE public.clipper_profiles ADD COLUMN IF NOT EXISTS max_clips_per_day integer NOT NULL DEFAULT 3;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_slots_active_unique
  ON public.campaign_slots (campaign_id, clipper_user_id) WHERE released = false;

-- Public-ish campaign stats for clippers (slots taken / remaining)
CREATE OR REPLACE FUNCTION public.campaign_slots_taken(_campaign_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.campaign_slots
  WHERE campaign_id = _campaign_id AND released = false
$$;

REVOKE ALL ON FUNCTION public.campaign_slots_taken(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.campaign_slots_taken(uuid) TO authenticated, service_role;

-- Does the caller hold an active slot on a campaign?
CREATE OR REPLACE FUNCTION public.has_active_slot(_campaign_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_slots
    WHERE campaign_id = _campaign_id AND clipper_user_id = _user_id AND released = false
  )
$$;

REVOKE ALL ON FUNCTION public.has_active_slot(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_active_slot(uuid, uuid) TO authenticated, service_role;

-- Claim a slot atomically; locks campaign when full
CREATE OR REPLACE FUNCTION public.join_campaign(_campaign_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _c record;
  _taken int;
  _slot_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'clipper') THEN
    RAISE EXCEPTION 'Only clippers can join campaigns';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clipper_profiles WHERE user_id = _uid AND banned) THEN
    RAISE EXCEPTION 'Your account is banned';
  END IF;

  SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;
  IF _c IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _c.status <> 'live' THEN RAISE EXCEPTION 'Campaign is not accepting clippers'; END IF;

  SELECT COUNT(*) INTO _taken FROM public.campaign_slots
   WHERE campaign_id = _campaign_id AND released = false;
  IF _taken >= _c.slots THEN
    UPDATE public.campaigns SET status = 'full' WHERE id = _campaign_id;
    RAISE EXCEPTION 'Campaign is full';
  END IF;

  INSERT INTO public.campaign_slots (campaign_id, clipper_user_id)
  VALUES (_campaign_id, _uid)
  ON CONFLICT DO NOTHING
  RETURNING id INTO _slot_id;

  IF _slot_id IS NULL THEN
    SELECT id INTO _slot_id FROM public.campaign_slots
     WHERE campaign_id = _campaign_id AND clipper_user_id = _uid AND released = false;
  END IF;

  IF _taken + 1 >= _c.slots THEN
    UPDATE public.campaigns SET status = 'full' WHERE id = _campaign_id;
  END IF;

  RETURN _slot_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_campaign(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_campaign(uuid) TO authenticated;

-- Only joined clippers may submit; enforce daily limit; stamp first_clip_at
CREATE OR REPLACE FUNCTION public.clip_submissions_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit int;
  _today int;
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  IF NOT public.has_active_slot(NEW.campaign_id, NEW.clipper_user_id) THEN
    RAISE EXCEPTION 'Join the campaign before submitting clips';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(max_clips_per_day, 3) INTO _limit
      FROM public.clipper_profiles WHERE user_id = NEW.clipper_user_id;
    _limit := COALESCE(_limit, 3);

    SELECT COUNT(*) INTO _today FROM public.clip_submissions
     WHERE clipper_user_id = NEW.clipper_user_id
       AND submitted_at >= date_trunc('day', now());

    IF _today >= _limit THEN
      RAISE EXCEPTION 'Daily limit reached: % clips per day', _limit;
    END IF;

    UPDATE public.campaign_slots
       SET first_clip_at = COALESCE(first_clip_at, now()), at_risk = false
     WHERE campaign_id = NEW.campaign_id
       AND clipper_user_id = NEW.clipper_user_id
       AND released = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clip_submissions_guard ON public.clip_submissions;
CREATE TRIGGER clip_submissions_guard
BEFORE INSERT OR UPDATE ON public.clip_submissions
FOR EACH ROW EXECUTE FUNCTION public.clip_submissions_guard();

-- Slot reclamation sweep (warn at 72h, release after warning, strike on repeats)
CREATE OR REPLACE FUNCTION public.reclaim_slots()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _warned int := 0;
  _released int := 0;
  _at_risk int := 0;
  r record;
BEGIN
  -- 1. warn joined-but-silent clippers at 72h
  FOR r IN
    SELECT s.* FROM public.campaign_slots s
    WHERE s.released = false AND s.first_clip_at IS NULL
      AND s.warned_at IS NULL AND s.joined_at <= now() - interval '72 hours'
  LOOP
    UPDATE public.campaign_slots SET warned_at = now() WHERE id = r.id;
    INSERT INTO public.notifications (user_id, message, type)
    VALUES (r.clipper_user_id,
            'You joined a campaign 72 hours ago without posting a clip. Post a clip within 24 hours or your slot will be released.',
            'slot_warning');
    _warned := _warned + 1;
  END LOOP;

  -- 2. release warned slots that stayed silent
  FOR r IN
    SELECT s.* FROM public.campaign_slots s
    WHERE s.released = false AND s.first_clip_at IS NULL
      AND s.warned_at IS NOT NULL AND s.warned_at <= now() - interval '24 hours'
  LOOP
    UPDATE public.campaign_slots
       SET released = true, released_at = now(), at_risk = false WHERE id = r.id;

    UPDATE public.campaigns SET status = 'live'
     WHERE id = r.campaign_id AND status = 'full';

    INSERT INTO public.clipper_profiles (user_id) VALUES (r.clipper_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.clipper_profiles
       SET strikes = strikes + CASE
             WHEN (SELECT COUNT(*) FROM public.campaign_slots
                    WHERE clipper_user_id = r.clipper_user_id AND released = true) > 1
             THEN 1 ELSE 0 END
     WHERE user_id = r.clipper_user_id;

    INSERT INTO public.notifications (user_id, message, type)
    VALUES (r.clipper_user_id, 'Your campaign slot was released because you did not post a clip in time.', 'slot_released');
    _released := _released + 1;
  END LOOP;

  -- 3. flag at-risk: only activity is a 5-day-old clip under 1,000 views
  FOR r IN
    SELECT s.* FROM public.campaign_slots s
    WHERE s.released = false AND s.at_risk = false AND s.first_clip_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.clip_submissions c
        WHERE c.campaign_id = s.campaign_id AND c.clipper_user_id = s.clipper_user_id
          AND (c.view_count >= 1000 OR c.posted_at > now() - interval '5 days')
      )
  LOOP
    UPDATE public.campaign_slots SET at_risk = true WHERE id = r.id;
    INSERT INTO public.notifications (user_id, message, type)
    VALUES (r.clipper_user_id, 'Your slot is at risk: no clip reached 1,000 views after 5 days.', 'slot_at_risk');
    _at_risk := _at_risk + 1;
  END LOOP;

  RETURN jsonb_build_object('warned', _warned, 'released', _released, 'at_risk', _at_risk);
END;
$$;

REVOKE ALL ON FUNCTION public.reclaim_slots() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclaim_slots() TO service_role;