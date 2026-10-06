-- EMAIL CONFIG (placeholder for the external email service)
CREATE TABLE public.email_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  provider_name text,
  endpoint text,
  from_email text,
  from_name text NOT NULL DEFAULT 'Cloutbase',
  api_key_secret_name text NOT NULL DEFAULT 'EMAIL_API_KEY',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.email_config TO authenticated;
GRANT ALL ON public.email_config TO service_role;
ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email config" ON public.email_config FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update email config" ON public.email_config FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER email_config_set_updated_at BEFORE UPDATE ON public.email_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.email_config (id) VALUES (true) ON CONFLICT DO NOTHING;

-- EMAIL LOG
CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'general',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email log" ON public.email_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX email_log_created_at_idx ON public.email_log (created_at DESC);

-- REVIEW QUEUE
CREATE OR REPLACE FUNCTION public.admin_review_queue()
RETURNS TABLE(
  id uuid, title text, brand_user_id uuid, brand_username text, brand_email text,
  budget numeric, clipper_pool numeric, per_clipper_ceiling numeric, rate_per_1000_views numeric,
  slots int, kpi_target text, caption text, hashtags text, brand_tag text, cta_link text,
  watermark_url text, source_file_link text, video_length_minutes numeric,
  duration_days int, funded boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.brand_user_id, p.username, p.email,
         c.budget, c.clipper_pool, c.per_clipper_ceiling, c.rate_per_1000_views,
         c.slots, c.kpi_target, c.caption, c.hashtags, c.brand_tag, c.cta_link,
         c.watermark_url, c.source_file_link, c.video_length_minutes,
         c.duration_days, c.funded, c.created_at
  FROM public.campaigns c
  JOIN public.profiles p ON p.id = c.brand_user_id
  WHERE public.is_admin(auth.uid())
    AND c.status = 'pending_review' AND c.funded = true
  ORDER BY c.created_at ASC
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_campaign(_campaign_id uuid, _duration_days int DEFAULT NULL)
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

CREATE OR REPLACE FUNCTION public.admin_reject_campaign(_campaign_id uuid, _reason text)
RETURNS TABLE(campaign_id uuid, title text, brand_email text, brand_username text, reason text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF COALESCE(btrim(_reason), '') = '' THEN RAISE EXCEPTION 'A rejection reason is required'; END IF;
  SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;
  IF _c IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  UPDATE public.campaigns SET status = 'rejected', reject_reason = _reason WHERE id = _campaign_id;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_c.brand_user_id, 'Your campaign "' || _c.title || '" was rejected: ' || _reason, 'campaign_rejected');

  RETURN QUERY
    SELECT c.id, c.title, p.email, p.username, c.reject_reason
    FROM public.campaigns c JOIN public.profiles p ON p.id = c.brand_user_id
    WHERE c.id = _campaign_id;
END;
$$;

-- ANALYTICS
CREATE OR REPLACE FUNCTION public.admin_campaign_analytics()
RETURNS TABLE(
  id uuid, title text, status campaign_status, brand_username text, brand_email text,
  budget numeric, clipper_pool numeric, per_clipper_ceiling numeric, rate_per_1000_views numeric,
  slots int, slots_taken int, clipper_count int, clip_count int,
  total_views bigint, tiktok_views bigint, ig_views bigint, youtube_views bigint,
  spent numeric, ends_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.status, p.username, p.email,
         c.budget, c.clipper_pool, c.per_clipper_ceiling, c.rate_per_1000_views, c.slots,
         (SELECT COUNT(*)::int FROM public.campaign_slots s WHERE s.campaign_id = c.id AND s.released = false),
         (SELECT COUNT(DISTINCT cs.clipper_user_id)::int FROM public.clip_submissions cs WHERE cs.campaign_id = c.id),
         (SELECT COUNT(*)::int FROM public.clip_submissions cs WHERE cs.campaign_id = c.id),
         COALESCE((SELECT SUM(cs.view_count)::bigint FROM public.clip_submissions cs WHERE cs.campaign_id = c.id), 0),
         COALESCE((SELECT SUM(cs.view_count)::bigint FROM public.clip_submissions cs WHERE cs.campaign_id = c.id AND cs.platform = 'tiktok'), 0),
         COALESCE((SELECT SUM(cs.view_count)::bigint FROM public.clip_submissions cs WHERE cs.campaign_id = c.id AND cs.platform = 'ig'), 0),
         COALESCE((SELECT SUM(cs.view_count)::bigint FROM public.clip_submissions cs WHERE cs.campaign_id = c.id AND cs.platform = 'youtube'), 0),
         COALESCE((SELECT SUM(cs.earnings) FROM public.clip_submissions cs WHERE cs.campaign_id = c.id), 0),
         c.ends_at, c.created_at
  FROM public.campaigns c
  JOIN public.profiles p ON p.id = c.brand_user_id
  WHERE public.is_admin(auth.uid())
  ORDER BY c.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_campaign_clippers(_campaign_id uuid)
RETURNS TABLE(
  clipper_user_id uuid, username text, real_name text, banned boolean, strikes int,
  clip_count int, total_views bigint, earnings numeric, unpaid numeric,
  joined_at timestamptz, first_clip_at timestamptz, at_risk boolean, released boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.clipper_user_id, p.username, cp.real_name, COALESCE(cp.banned, false), COALESCE(cp.strikes, 0),
         COALESCE(cl.clips, 0), COALESCE(cl.views, 0), COALESCE(cl.earnings, 0), COALESCE(cl.unpaid, 0),
         s.joined_at, s.first_clip_at, COALESCE(s.at_risk, false), COALESCE(s.released, false)
  FROM (
    SELECT clipper_user_id FROM public.campaign_slots WHERE campaign_id = _campaign_id
    UNION
    SELECT clipper_user_id FROM public.clip_submissions WHERE campaign_id = _campaign_id
  ) u
  JOIN public.profiles p ON p.id = u.clipper_user_id
  LEFT JOIN public.clipper_profiles cp ON cp.user_id = u.clipper_user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS clips, SUM(cs.view_count)::bigint AS views,
           SUM(cs.earnings) AS earnings,
           SUM(CASE WHEN cs.paid THEN 0 ELSE cs.earnings END) AS unpaid
    FROM public.clip_submissions cs
    WHERE cs.campaign_id = _campaign_id AND cs.clipper_user_id = u.clipper_user_id
  ) cl ON true
  LEFT JOIN LATERAL (
    SELECT * FROM public.campaign_slots s2
    WHERE s2.campaign_id = _campaign_id AND s2.clipper_user_id = u.clipper_user_id
    ORDER BY s2.joined_at DESC LIMIT 1
  ) s ON true
  WHERE public.is_admin(auth.uid())
  ORDER BY COALESCE(cl.views, 0) DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_clipper_clips(_campaign_id uuid, _clipper_user_id uuid)
RETURNS TABLE(
  id uuid, platform clip_platform, clip_link text, view_count int, snapshot_view_count int,
  earnings numeric, paid boolean, paid_at timestamptz, is_live boolean,
  deleted_before_snapshot boolean, posted_at timestamptz, counts_from timestamptz,
  last_checked_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cs.id, cs.platform, cs.clip_link, cs.view_count, cs.snapshot_view_count,
         cs.earnings, cs.paid, cs.paid_at, cs.is_live, cs.deleted_before_snapshot,
         cs.posted_at, cs.counts_from, cs.last_checked_at
  FROM public.clip_submissions cs
  WHERE public.is_admin(auth.uid())
    AND cs.campaign_id = _campaign_id AND cs.clipper_user_id = _clipper_user_id
  ORDER BY cs.posted_at DESC
$$;

CREATE OR REPLACE FUNCTION public.admin_campaign_views_over_time(_campaign_id uuid)
RETURNS TABLE(day date, views bigint, cumulative_views bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH daily AS (
    SELECT date_trunc('day', r.recorded_at)::date AS day, MAX(r.view_count)::bigint AS views
    FROM public.clip_view_readings r
    JOIN public.clip_submissions cs ON cs.id = r.clip_submission_id
    WHERE cs.campaign_id = _campaign_id
    GROUP BY 1, cs.id
  ), rolled AS (
    SELECT day, SUM(views)::bigint AS views FROM daily GROUP BY day
  )
  SELECT day, views, SUM(views) OVER (ORDER BY day)::bigint
  FROM rolled
  WHERE public.is_admin(auth.uid())
  ORDER BY day
$$;

CREATE OR REPLACE FUNCTION public.admin_flags()
RETURNS TABLE(
  kind text, campaign_id uuid, campaign_title text, clipper_user_id uuid, username text,
  detail text, at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM (
  SELECT 'slot_near_release'::text AS kind, s.campaign_id, c.title AS campaign_title, s.clipper_user_id, p.username,
         'Joined without posting — auto-release approaching'::text AS detail, s.joined_at AS at
  FROM public.campaign_slots s
  JOIN public.campaigns c ON c.id = s.campaign_id
  JOIN public.profiles p ON p.id = s.clipper_user_id
  WHERE public.is_admin(auth.uid())
    AND s.released = false AND s.first_clip_at IS NULL
    AND s.joined_at <= now() - interval '48 hours'
  UNION ALL
  SELECT 'low_views'::text, cs.campaign_id, c.title, cs.clipper_user_id, p.username,
         'Under 1,000 views after 5 days'::text, cs.posted_at
  FROM public.clip_submissions cs
  JOIN public.campaigns c ON c.id = cs.campaign_id
  JOIN public.profiles p ON p.id = cs.clipper_user_id
  WHERE public.is_admin(auth.uid())
    AND cs.posted_at <= now() - interval '5 days'
    AND COALESCE(cs.snapshot_view_count, cs.view_count) < 1000
  ) f
  ORDER BY f.at ASC
$$;

-- SUPER ADMIN ROLE MANAGEMENT
CREATE OR REPLACE FUNCTION public.super_admin_user_list()
RETURNS TABLE(user_id uuid, username text, email text, roles text[], created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.email,
         COALESCE(ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.id ORDER BY ur.role::text), '{}'),
         p.created_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'super_admin')
  ORDER BY p.created_at DESC
$$;

CREATE OR REPLACE FUNCTION public.super_admin_promote(_email text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Super admins only'; END IF;
  SELECT id INTO _uid FROM public.profiles WHERE lower(email) = lower(btrim(_email));
  IF _uid IS NULL THEN RAISE EXCEPTION 'No user with that email'; END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'admin') ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_uid, 'You are now a Cloutbase admin.', 'role_granted');

  RETURN _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.super_admin_demote(_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'Super admins only'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_queue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_campaign(uuid, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_campaign(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_campaign_analytics() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_campaign_clippers(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_clipper_clips(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_campaign_views_over_time(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_flags() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.super_admin_user_list() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.super_admin_promote(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.super_admin_demote(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_review_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_campaign(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_campaign(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_campaign_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_campaign_clippers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clipper_clips(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_campaign_views_over_time(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_flags() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_user_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_promote(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_demote(uuid) TO authenticated;