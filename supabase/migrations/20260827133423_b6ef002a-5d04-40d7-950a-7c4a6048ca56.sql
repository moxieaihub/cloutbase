REVOKE ALL ON FUNCTION public.clip_submissions_guard() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_active_slot(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.campaign_slots_taken(uuid) FROM authenticated;

-- Single read surface for clippers: live campaigns + slot availability + own slot state
CREATE OR REPLACE FUNCTION public.clipper_campaign_feed()
RETURNS TABLE (
  id uuid,
  title text,
  kpi_target text,
  per_clipper_ceiling numeric,
  rate_per_1000_views numeric,
  slots integer,
  slots_taken integer,
  ends_at timestamptz,
  status public.campaign_status,
  joined boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.title, c.kpi_target, c.per_clipper_ceiling, c.rate_per_1000_views,
         c.slots,
         (SELECT COUNT(*)::int FROM public.campaign_slots s
           WHERE s.campaign_id = c.id AND s.released = false) AS slots_taken,
         c.ends_at, c.status,
         EXISTS (SELECT 1 FROM public.campaign_slots s
                  WHERE s.campaign_id = c.id AND s.clipper_user_id = auth.uid()
                    AND s.released = false) AS joined
  FROM public.campaigns c
  WHERE auth.uid() IS NOT NULL
    AND c.status IN ('live','full')
    AND (c.ends_at IS NULL OR c.ends_at > now())
  ORDER BY c.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.clipper_campaign_feed() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.clipper_campaign_feed() TO authenticated;

-- Full brief for one campaign, readable by any signed-in clipper
CREATE OR REPLACE FUNCTION public.clipper_campaign_brief(_campaign_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  kpi_target text,
  caption text,
  hashtags text,
  brand_tag text,
  cta_link text,
  watermark_url text,
  source_file_link text,
  video_length_minutes numeric,
  per_clipper_ceiling numeric,
  rate_per_1000_views numeric,
  slots integer,
  slots_taken integer,
  ends_at timestamptz,
  status public.campaign_status,
  joined boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.title, c.kpi_target, c.caption, c.hashtags, c.brand_tag, c.cta_link,
         c.watermark_url, c.source_file_link, c.video_length_minutes,
         c.per_clipper_ceiling, c.rate_per_1000_views, c.slots,
         (SELECT COUNT(*)::int FROM public.campaign_slots s
           WHERE s.campaign_id = c.id AND s.released = false) AS slots_taken,
         c.ends_at, c.status,
         EXISTS (SELECT 1 FROM public.campaign_slots s
                  WHERE s.campaign_id = c.id AND s.clipper_user_id = auth.uid()
                    AND s.released = false) AS joined
  FROM public.campaigns c
  WHERE c.id = _campaign_id
    AND auth.uid() IS NOT NULL
    AND c.status IN ('live','full')
$$;

REVOKE ALL ON FUNCTION public.clipper_campaign_brief(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.clipper_campaign_brief(uuid) TO authenticated;