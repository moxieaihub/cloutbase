
-- 1. clipper application fields
ALTER TABLE public.clipper_profiles
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text;

-- 2. campaign gating fields
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS min_followers integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_access_hours integer NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS live_at timestamptz;

UPDATE public.campaigns SET live_at = COALESCE(live_at, created_at) WHERE status IN ('live','full','ended');

-- 3. in-house settings (Cloutbase watermark)
CREATE TABLE IF NOT EXISTS public.inhouse_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  watermark_url text,
  min_followers integer NOT NULL DEFAULT 5000,
  priority_group_link text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.inhouse_config TO authenticated;
GRANT ALL ON public.inhouse_config TO service_role;

ALTER TABLE public.inhouse_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read inhouse config" ON public.inhouse_config;
CREATE POLICY "Authenticated can read inhouse config" ON public.inhouse_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins update inhouse config" ON public.inhouse_config;
CREATE POLICY "Admins update inhouse config" ON public.inhouse_config
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.inhouse_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS inhouse_config_set_updated_at ON public.inhouse_config;
CREATE TRIGGER inhouse_config_set_updated_at BEFORE UPDATE ON public.inhouse_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. helper: is this clipper an approved in-house clipper?
CREATE OR REPLACE FUNCTION public.is_official_clipper(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clipper_profiles
    WHERE user_id = _user_id AND is_approved = true AND banned = false
  )
$$;

-- 5. apply for the in-house programme
CREATE OR REPLACE FUNCTION public.apply_inhouse_clipper(_followers integer, _avg_views integer, _whatsapp text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _min int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'clipper') THEN RAISE EXCEPTION 'Only clipper accounts can apply'; END IF;

  SELECT min_followers INTO _min FROM public.inhouse_config WHERE id = true;
  _min := COALESCE(_min, 5000);

  IF COALESCE(_followers, 0) < _min THEN
    RAISE EXCEPTION 'You need at least % followers to apply', _min;
  END IF;
  IF COALESCE(_avg_views, 0) <= 0 THEN RAISE EXCEPTION 'Average monthly views is required'; END IF;
  IF COALESCE(btrim(_whatsapp), '') = '' THEN RAISE EXCEPTION 'WhatsApp contact is required'; END IF;

  INSERT INTO public.clipper_profiles (user_id, followers_count, avg_views, whatsapp, applied_at)
  VALUES (_uid, _followers, _avg_views, btrim(_whatsapp), now())
  ON CONFLICT (user_id) DO UPDATE
    SET followers_count = EXCLUDED.followers_count,
        avg_views = EXCLUDED.avg_views,
        whatsapp = EXCLUDED.whatsapp,
        applied_at = now(),
        reject_reason = NULL;
END;
$$;

-- 6. admin application queue
CREATE OR REPLACE FUNCTION public.admin_clipper_applications()
RETURNS TABLE(user_id uuid, username text, email text, followers_count integer, avg_views integer,
              whatsapp text, applied_at timestamptz, is_approved boolean, approved_at timestamptz,
              reject_reason text, banned boolean, strikes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cp.user_id, p.username, p.email, cp.followers_count, cp.avg_views, cp.whatsapp,
         cp.applied_at, cp.is_approved, cp.approved_at, cp.reject_reason, cp.banned, cp.strikes
  FROM public.clipper_profiles cp
  JOIN public.profiles p ON p.id = cp.user_id
  WHERE public.is_admin(auth.uid()) AND cp.applied_at IS NOT NULL
  ORDER BY (cp.is_approved OR cp.reject_reason IS NOT NULL), cp.applied_at ASC
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_clipper(_user_id uuid, _max_clips_per_day integer DEFAULT 10)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;

  UPDATE public.clipper_profiles
     SET is_approved = true, is_inhouse = true, is_priority = true,
         approved_at = now(), reject_reason = NULL,
         max_clips_per_day = GREATEST(COALESCE(_max_clips_per_day, 10), max_clips_per_day)
   WHERE user_id = _user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Clipper profile not found'; END IF;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_user_id, 'You are now an Official Cloutbase Clipper — early campaign access, higher daily limits and the priority group are unlocked.', 'clipper_approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_clipper(_user_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF COALESCE(btrim(_reason), '') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;

  UPDATE public.clipper_profiles
     SET is_approved = false, is_inhouse = false, is_priority = false,
         approved_at = NULL, reject_reason = _reason
   WHERE user_id = _user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Clipper profile not found'; END IF;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_user_id, 'Your Official Clipper application was not approved: ' || _reason, 'clipper_rejected');
END;
$$;

-- 7. eligibility helper
CREATE OR REPLACE FUNCTION public.clipper_can_join(_campaign_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    LEFT JOIN public.clipper_profiles cp ON cp.user_id = _user_id
    WHERE c.id = _campaign_id
      AND COALESCE(cp.banned, false) = false
      AND (
        c.is_inhouse = false
        OR (COALESCE(cp.is_approved, false) AND COALESCE(cp.followers_count, 0) >= c.min_followers)
      )
      AND (
        c.is_inhouse
        OR COALESCE(cp.is_priority, false)
        OR now() >= COALESCE(c.live_at, c.created_at) + (c.early_access_hours || ' hours')::interval
      )
  )
$$;

-- 8. feeds with in-house + early access awareness
DROP FUNCTION IF EXISTS public.clipper_campaign_feed();
CREATE FUNCTION public.clipper_campaign_feed()
RETURNS TABLE(id uuid, title text, kpi_target text, per_clipper_ceiling numeric, rate_per_1000_views numeric,
              slots integer, slots_taken integer, ends_at timestamptz, status campaign_status, joined boolean,
              is_inhouse boolean, min_followers integer, early_access_until timestamptz, can_join boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.kpi_target, c.per_clipper_ceiling, c.rate_per_1000_views,
         c.slots,
         (SELECT COUNT(*)::int FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.released = false),
         c.ends_at, c.status,
         EXISTS (SELECT 1 FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.clipper_user_id = auth.uid() AND s.released = false),
         c.is_inhouse, c.min_followers,
         COALESCE(c.live_at, c.created_at) + (c.early_access_hours || ' hours')::interval,
         public.clipper_can_join(c.id, auth.uid())
  FROM public.campaigns c
  WHERE auth.uid() IS NOT NULL
    AND c.status IN ('live','full')
    AND (c.ends_at IS NULL OR c.ends_at > now())
    AND (c.is_inhouse = false OR public.is_official_clipper(auth.uid()))
  ORDER BY c.is_inhouse DESC, c.created_at DESC
$$;

DROP FUNCTION IF EXISTS public.clipper_campaign_brief(uuid);
CREATE FUNCTION public.clipper_campaign_brief(_campaign_id uuid)
RETURNS TABLE(id uuid, title text, kpi_target text, caption text, hashtags text, brand_tag text, cta_link text,
              watermark_url text, source_file_link text, video_length_minutes numeric, per_clipper_ceiling numeric,
              rate_per_1000_views numeric, slots integer, slots_taken integer, ends_at timestamptz,
              status campaign_status, joined boolean, is_inhouse boolean, min_followers integer,
              early_access_until timestamptz, can_join boolean, cloutbase_watermark_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.kpi_target, c.caption, c.hashtags, c.brand_tag, c.cta_link,
         c.watermark_url, c.source_file_link, c.video_length_minutes,
         c.per_clipper_ceiling, c.rate_per_1000_views, c.slots,
         (SELECT COUNT(*)::int FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.released = false),
         c.ends_at, c.status,
         EXISTS (SELECT 1 FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.clipper_user_id = auth.uid() AND s.released = false),
         c.is_inhouse, c.min_followers,
         COALESCE(c.live_at, c.created_at) + (c.early_access_hours || ' hours')::interval,
         public.clipper_can_join(c.id, auth.uid()),
         CASE WHEN c.is_inhouse THEN (SELECT ic.watermark_url FROM public.inhouse_config ic WHERE ic.id = true) ELSE NULL END
  FROM public.campaigns c
  WHERE c.id = _campaign_id
    AND auth.uid() IS NOT NULL
    AND c.status IN ('live','full')
    AND (c.is_inhouse = false OR public.is_official_clipper(auth.uid()))
$$;

-- 9. join gating
CREATE OR REPLACE FUNCTION public.join_campaign(_campaign_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF _c.is_inhouse AND NOT public.is_official_clipper(_uid) THEN
    RAISE EXCEPTION 'In-house campaigns are for approved Official Clippers only';
  END IF;

  IF NOT public.clipper_can_join(_campaign_id, _uid) THEN
    IF _c.is_inhouse THEN
      RAISE EXCEPTION 'You do not meet the requirement for this in-house campaign';
    ELSE
      RAISE EXCEPTION 'Official Clippers get early access — this campaign opens to everyone shortly';
    END IF;
  END IF;

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

-- 10. approval stamps live_at
CREATE OR REPLACE FUNCTION public.admin_approve_campaign(_campaign_id uuid, _duration_days integer DEFAULT NULL::integer)
RETURNS TABLE(campaign_id uuid, title text, brand_email text, brand_username text, ends_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _days int; _c record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;
  IF _c IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _c.funded IS NOT TRUE THEN RAISE EXCEPTION 'Campaign is not funded'; END IF;
  IF _c.status <> 'pending_review' THEN RAISE EXCEPTION 'Campaign is not awaiting review'; END IF;

  _days := COALESCE(_duration_days, _c.duration_days, 7);

  UPDATE public.campaigns
     SET status = 'live', duration_days = _days, ends_at = now() + (_days || ' days')::interval,
         reject_reason = NULL, live_at = now()
   WHERE id = _campaign_id;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_c.brand_user_id, 'Your campaign "' || _c.title || '" is live.', 'campaign_live');

  RETURN QUERY
    SELECT c.id, c.title, p.email, p.username, c.ends_at
    FROM public.campaigns c JOIN public.profiles p ON p.id = c.brand_user_id
    WHERE c.id = _campaign_id;
END;
$$;

-- 11. admin creates an in-house campaign
CREATE OR REPLACE FUNCTION public.admin_create_inhouse_campaign(
  _title text, _source_file_link text, _video_length_minutes numeric, _budget numeric,
  _slots integer, _rate_per_1000_views numeric, _duration_days integer, _kpi_target text,
  _caption text, _hashtags text, _brand_tag text, _cta_link text, _min_followers integer DEFAULT 5000
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _wm text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF COALESCE(btrim(_title),'') = '' THEN RAISE EXCEPTION 'Title is required'; END IF;
  IF COALESCE(_slots,0) < 1 THEN RAISE EXCEPTION 'At least one slot is required'; END IF;
  IF COALESCE(_budget,0) <= 0 THEN RAISE EXCEPTION 'Budget is required'; END IF;

  SELECT watermark_url INTO _wm FROM public.inhouse_config WHERE id = true;

  INSERT INTO public.campaigns (
    brand_user_id, title, source_file_link, video_length_minutes, budget, slots,
    rate_per_1000_views, duration_days, ends_at, kpi_target, caption, hashtags, brand_tag,
    cta_link, watermark_url, status, is_inhouse, funded, min_followers, early_access_hours, live_at
  ) VALUES (
    auth.uid(), btrim(_title), _source_file_link, _video_length_minutes, _budget, _slots,
    COALESCE(_rate_per_1000_views, 100), COALESCE(_duration_days, 7),
    now() + (COALESCE(_duration_days, 7) || ' days')::interval,
    _kpi_target, _caption, _hashtags, _brand_tag, _cta_link, _wm,
    'live', true, true, COALESCE(_min_followers, 0), 0, now()
  ) RETURNING id INTO _id;

  RETURN _id;
END;
$$;
