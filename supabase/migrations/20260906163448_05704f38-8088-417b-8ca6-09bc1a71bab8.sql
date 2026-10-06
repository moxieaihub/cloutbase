ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS target_platforms clip_platform[] NOT NULL
  DEFAULT ARRAY['tiktok','ig','youtube']::clip_platform[];

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_target_platforms_not_empty
  CHECK (array_length(target_platforms, 1) >= 1);

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS is_bonus boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.clip_submissions_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _limit int;
  _today int;
  _targets clip_platform[];
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  IF NOT public.has_active_slot(NEW.campaign_id, NEW.clipper_user_id) THEN
    RAISE EXCEPTION 'Join the campaign before submitting clips';
  END IF;

  SELECT target_platforms INTO _targets FROM public.campaigns WHERE id = NEW.campaign_id;
  IF _targets IS NOT NULL AND NOT (NEW.platform = ANY (_targets)) THEN
    RAISE EXCEPTION 'This campaign does not run on that platform';
  END IF;

  IF TG_OP = 'INSERT' THEN
    _limit := COALESCE(public.clipper_daily_limit(NEW.clipper_user_id), 3);

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
$function$;

DROP FUNCTION IF EXISTS public.clipper_campaign_feed();
CREATE FUNCTION public.clipper_campaign_feed()
 RETURNS TABLE(id uuid, title text, kpi_target text, per_clipper_ceiling numeric, rate_per_1000_views numeric, slots integer, slots_taken integer, ends_at timestamp with time zone, status campaign_status, joined boolean, is_inhouse boolean, min_followers integer, early_access_until timestamp with time zone, can_join boolean, clipper_pool numeric, spent numeric, target_platforms clip_platform[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.title, c.kpi_target, c.per_clipper_ceiling, c.rate_per_1000_views,
         c.slots,
         (SELECT COUNT(*)::int FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.released = false),
         c.ends_at, c.status,
         EXISTS (SELECT 1 FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.clipper_user_id = auth.uid() AND s.released = false),
         c.is_inhouse, c.min_followers,
         COALESCE(c.live_at, c.created_at) + (c.early_access_hours || ' hours')::interval,
         public.clipper_can_join(c.id, auth.uid()),
         c.clipper_pool,
         COALESCE((SELECT SUM(cs.earnings) FROM public.clip_submissions cs WHERE cs.campaign_id = c.id), 0),
         c.target_platforms
  FROM public.campaigns c
  WHERE auth.uid() IS NOT NULL
    AND c.status IN ('live','full')
    AND (c.ends_at IS NULL OR c.ends_at > now())
    AND (c.is_inhouse = false OR public.is_official_clipper(auth.uid()))
  ORDER BY c.is_inhouse DESC, c.created_at DESC
$function$;
REVOKE ALL ON FUNCTION public.clipper_campaign_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clipper_campaign_feed() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.clipper_campaign_brief(uuid);
CREATE FUNCTION public.clipper_campaign_brief(_campaign_id uuid)
 RETURNS TABLE(id uuid, title text, kpi_target text, caption text, hashtags text, brand_tag text, cta_link text, watermark_url text, source_file_link text, video_length_minutes numeric, per_clipper_ceiling numeric, rate_per_1000_views numeric, slots integer, slots_taken integer, ends_at timestamp with time zone, status campaign_status, joined boolean, is_inhouse boolean, min_followers integer, early_access_until timestamp with time zone, can_join boolean, cloutbase_watermark_url text, clipper_pool numeric, spent numeric, target_platforms clip_platform[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.id, c.title, c.kpi_target, c.caption, c.hashtags, c.brand_tag, c.cta_link,
         c.watermark_url, c.source_file_link, c.video_length_minutes,
         c.per_clipper_ceiling, c.rate_per_1000_views, c.slots,
         (SELECT COUNT(*)::int FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.released = false),
         c.ends_at, c.status,
         EXISTS (SELECT 1 FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.clipper_user_id = auth.uid() AND s.released = false),
         c.is_inhouse, c.min_followers,
         COALESCE(c.live_at, c.created_at) + (c.early_access_hours || ' hours')::interval,
         public.clipper_can_join(c.id, auth.uid()),
         CASE WHEN c.is_inhouse THEN (SELECT ic.watermark_url FROM public.inhouse_config ic WHERE ic.id = true) ELSE NULL END,
         c.clipper_pool,
         COALESCE((SELECT SUM(cs.earnings) FROM public.clip_submissions cs WHERE cs.campaign_id = c.id), 0),
         c.target_platforms
  FROM public.campaigns c
  WHERE c.id = _campaign_id
    AND auth.uid() IS NOT NULL
    AND c.status IN ('live','full')
    AND (c.is_inhouse = false OR public.is_official_clipper(auth.uid()))
$function$;
REVOKE ALL ON FUNCTION public.clipper_campaign_brief(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clipper_campaign_brief(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_bonus_pool()
 RETURNS TABLE(reserve_total numeric, bonuses_paid numeric, bonuses_pending numeric, rollover numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE((SELECT SUM(reserve_amount) FROM public.campaigns WHERE funded = true), 0),
    COALESCE((SELECT SUM(amount) FROM public.payouts WHERE is_bonus = true AND status = 'paid'), 0),
    COALESCE((SELECT SUM(amount) FROM public.payouts WHERE is_bonus = true AND status <> 'paid'), 0),
    COALESCE((SELECT SUM(reserve_amount) FROM public.campaigns WHERE funded = true), 0)
      - COALESCE((SELECT SUM(amount) FROM public.payouts WHERE is_bonus = true), 0)
  WHERE public.is_admin(auth.uid())
$function$;
REVOKE ALL ON FUNCTION public.admin_bonus_pool() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_bonus_pool() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_pay_bonus(_clipper_user_id uuid, _amount numeric, _note text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _id uuid; _left numeric;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF COALESCE(_amount, 0) <= 0 THEN RAISE EXCEPTION 'Bonus amount must be greater than zero'; END IF;

  SELECT rollover INTO _left FROM public.admin_bonus_pool();
  IF COALESCE(_left, 0) < _amount THEN
    RAISE EXCEPTION 'Bonus pool only has % left', COALESCE(_left, 0);
  END IF;

  INSERT INTO public.payouts (clipper_user_id, amount, status, is_bonus, note, released_by_admin_id, released_at)
  VALUES (_clipper_user_id, _amount, 'paid', true, COALESCE(_note, 'Reserve bonus'), auth.uid(), now())
  RETURNING id INTO _id;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_clipper_user_id, 'Bonus paid from the campaign reserve pool.', 'payout');

  RETURN _id;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_pay_bonus(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_pay_bonus(uuid, numeric, text) TO authenticated, service_role;