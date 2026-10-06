
CREATE OR REPLACE FUNCTION public.brand_campaign_analytics()
RETURNS TABLE (
  campaign_id uuid, title text, status text, budget numeric, clipper_pool numeric,
  per_clipper_ceiling numeric, rate_per_1000_views numeric, slots int, slots_taken bigint,
  clipper_count bigint, clip_count bigint, total_views bigint,
  tiktok_views bigint, ig_views bigint, youtube_views bigint,
  spent numeric, ends_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.status::text, c.budget, c.clipper_pool, c.per_clipper_ceiling,
    c.rate_per_1000_views, c.slots,
    (SELECT count(*) FROM campaign_slots s WHERE s.campaign_id = c.id AND s.released = false),
    (SELECT count(DISTINCT cs.clipper_user_id) FROM clip_submissions cs WHERE cs.campaign_id = c.id),
    (SELECT count(*) FROM clip_submissions cs WHERE cs.campaign_id = c.id),
    COALESCE((SELECT sum(cs.view_count) FROM clip_submissions cs WHERE cs.campaign_id = c.id), 0),
    COALESCE((SELECT sum(cs.view_count) FROM clip_submissions cs WHERE cs.campaign_id = c.id AND cs.platform = 'tiktok'), 0),
    COALESCE((SELECT sum(cs.view_count) FROM clip_submissions cs WHERE cs.campaign_id = c.id AND cs.platform = 'ig'), 0),
    COALESCE((SELECT sum(cs.view_count) FROM clip_submissions cs WHERE cs.campaign_id = c.id AND cs.platform = 'youtube'), 0),
    COALESCE((SELECT sum(cs.earnings) FROM clip_submissions cs WHERE cs.campaign_id = c.id), 0),
    c.ends_at, c.created_at
  FROM campaigns c
  WHERE c.brand_user_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.brand_campaign_clips(_campaign_id uuid)
RETURNS TABLE (
  id uuid, username text, platform text, clip_link text, view_count bigint,
  earnings numeric, posted_at timestamptz, paid boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cs.id, p.username, cs.platform::text, cs.clip_link, cs.view_count::bigint,
         cs.earnings, cs.posted_at, cs.paid
  FROM clip_submissions cs
  JOIN campaigns c ON c.id = cs.campaign_id
  LEFT JOIN profiles p ON p.id = cs.clipper_user_id
  WHERE cs.campaign_id = _campaign_id
    AND c.brand_user_id = auth.uid()
  ORDER BY cs.view_count DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.admin_platform_overview()
RETURNS TABLE (
  lifetime_views bigint, live_campaigns bigint, total_campaigns bigint,
  total_clippers bigint, total_owed numeric, total_paid numeric,
  tiktok_views bigint, ig_views bigint, youtube_views bigint, pending_review bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE((SELECT sum(view_count) FROM clip_submissions), 0),
    (SELECT count(*) FROM campaigns WHERE status = 'live'),
    (SELECT count(*) FROM campaigns),
    (SELECT count(*) FROM clipper_profiles),
    COALESCE((SELECT sum(earnings) FROM clip_submissions WHERE paid = false), 0),
    COALESCE((SELECT sum(earnings) FROM clip_submissions WHERE paid = true), 0),
    COALESCE((SELECT sum(view_count) FROM clip_submissions WHERE platform = 'tiktok'), 0),
    COALESCE((SELECT sum(view_count) FROM clip_submissions WHERE platform = 'ig'), 0),
    COALESCE((SELECT sum(view_count) FROM clip_submissions WHERE platform = 'youtube'), 0),
    (SELECT count(*) FROM campaigns WHERE status = 'pending_review')
  WHERE public.is_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.brand_campaign_analytics() FROM anon;
REVOKE ALL ON FUNCTION public.brand_campaign_clips(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_platform_overview() FROM anon;
GRANT EXECUTE ON FUNCTION public.brand_campaign_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.brand_campaign_clips(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_platform_overview() TO authenticated;
