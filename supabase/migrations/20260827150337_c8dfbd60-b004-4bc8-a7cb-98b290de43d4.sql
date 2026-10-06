ALTER TABLE public.clip_submissions
  ADD COLUMN IF NOT EXISTS watermark_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS watermark_verified boolean,
  ADD COLUMN IF NOT EXISTS watermark_note text,
  ADD COLUMN IF NOT EXISTS watermark_reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.clip_watermark_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _inhouse boolean; _wm text;
BEGIN
  SELECT is_inhouse INTO _inhouse FROM public.campaigns WHERE id = NEW.campaign_id;
  IF COALESCE(_inhouse, false) THEN
    SELECT NULLIF(btrim(COALESCE(cloutbase_watermark_url, '')), '') INTO _wm
      FROM public.inhouse_config WHERE id = true;
    IF _wm IS NULL THEN
      RAISE EXCEPTION 'The Cloutbase watermark has not been uploaded yet — in-house clips cannot be submitted.';
    END IF;
    IF TG_OP = 'INSERT' AND NOT public.is_admin(auth.uid()) AND NEW.watermark_confirmed IS NOT TRUE THEN
      RAISE EXCEPTION 'Confirm the Cloutbase watermark is on this clip before submitting.';
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN
      NEW.watermark_confirmed := true;
      NEW.watermark_verified := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clip_submissions_watermark_guard ON public.clip_submissions;
CREATE TRIGGER clip_submissions_watermark_guard
BEFORE INSERT OR UPDATE ON public.clip_submissions
FOR EACH ROW EXECUTE FUNCTION public.clip_watermark_guard();

CREATE OR REPLACE FUNCTION public.recalc_clipper_earnings(_campaign_id uuid, _clipper_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _rate numeric;
  _ceiling numeric;
BEGIN
  SELECT rate_per_1000_views, per_clipper_ceiling
    INTO _rate, _ceiling
  FROM public.campaigns WHERE id = _campaign_id;

  IF _rate IS NULL THEN RETURN; END IF;

  WITH ordered AS (
    SELECT id,
           CASE
             WHEN deleted_before_snapshot THEN 0
             WHEN watermark_verified IS FALSE THEN 0
             WHEN counts_from IS NULL OR now() < counts_from THEN 0
             WHEN COALESCE(snapshot_view_count, view_count) >= 1000
               THEN round((COALESCE(snapshot_view_count, view_count)::numeric / 1000) * _rate, 2)
             ELSE 0
           END AS gross,
           posted_at, submitted_at
    FROM public.clip_submissions
    WHERE campaign_id = _campaign_id AND clipper_user_id = _clipper_user_id
  ), stacked AS (
    SELECT id, gross,
           SUM(gross) OVER (ORDER BY posted_at, submitted_at, id
                            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running
    FROM ordered
  ), capped AS (
    SELECT id,
           GREATEST(LEAST(running, COALESCE(_ceiling,0)) - (running - gross), 0) AS payable
    FROM stacked
  )
  UPDATE public.clip_submissions cs
  SET earnings = capped.payable
  FROM capped
  WHERE cs.id = capped.id AND cs.earnings IS DISTINCT FROM capped.payable;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_campaign(_campaign_id uuid, _duration_days integer DEFAULT NULL::integer)
RETURNS TABLE(campaign_id uuid, title text, brand_email text, brand_username text, ends_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _days int; _c record; _wm text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;
  IF _c IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _c.funded IS NOT TRUE THEN RAISE EXCEPTION 'Campaign is not funded'; END IF;
  IF _c.status <> 'pending_review' THEN RAISE EXCEPTION 'Campaign is not awaiting review'; END IF;

  IF COALESCE(_c.is_inhouse, false) THEN
    SELECT NULLIF(btrim(COALESCE(cloutbase_watermark_url, '')), '') INTO _wm
      FROM public.inhouse_config WHERE id = true;
    IF _wm IS NULL THEN
      RAISE EXCEPTION 'Upload the Cloutbase watermark before taking an in-house campaign live.';
    END IF;
  END IF;

  _days := COALESCE(_duration_days, _c.duration_days, 7);

  UPDATE public.campaigns
     SET status = 'live', duration_days = _days, ends_at = now() + (_days || ' days')::interval, reject_reason = NULL
   WHERE id = _campaign_id;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_c.brand_user_id, 'Your campaign "' || _c.title || '" is live.', 'campaign_live');

  RETURN QUERY
    SELECT c.id, c.title, p.email, p.username, c.ends_at
    FROM public.campaigns c JOIN public.profiles p ON p.id = c.brand_user_id
    WHERE c.id = _campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_inhouse_clip_queue()
RETURNS TABLE(id uuid, campaign_id uuid, campaign_title text, clipper_user_id uuid, username text,
              platform clip_platform, clip_link text, view_count integer, posted_at timestamptz,
              watermark_confirmed boolean, watermark_verified boolean, watermark_note text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cs.id, cs.campaign_id, c.title, cs.clipper_user_id, p.username,
         cs.platform, cs.clip_link, cs.view_count, cs.posted_at,
         cs.watermark_confirmed, cs.watermark_verified, cs.watermark_note
  FROM public.clip_submissions cs
  JOIN public.campaigns c ON c.id = cs.campaign_id
  JOIN public.profiles p ON p.id = cs.clipper_user_id
  WHERE public.is_admin(auth.uid()) AND c.is_inhouse = true
  ORDER BY (cs.watermark_verified IS NULL) DESC, cs.posted_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_set_clip_watermark(_clip_id uuid, _ok boolean, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _cs record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO _cs FROM public.clip_submissions WHERE id = _clip_id;
  IF _cs IS NULL THEN RAISE EXCEPTION 'Clip not found'; END IF;

  UPDATE public.clip_submissions
     SET watermark_verified = _ok, watermark_note = _note, watermark_reviewed_at = now()
   WHERE id = _clip_id;

  PERFORM public.recalc_clipper_earnings(_cs.campaign_id, _cs.clipper_user_id);

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_cs.clipper_user_id,
          CASE WHEN _ok THEN 'Watermark verified on your in-house clip.'
               ELSE 'Your in-house clip was rejected: the Cloutbase watermark is missing' ||
                    COALESCE(' — ' || _note, '') || '. It will not earn.' END,
          CASE WHEN _ok THEN 'watermark_ok' ELSE 'watermark_rejected' END);
END;
$$;