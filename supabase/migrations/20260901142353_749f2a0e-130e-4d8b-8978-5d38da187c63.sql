DROP FUNCTION IF EXISTS public.clipper_campaign_feed();
CREATE FUNCTION public.clipper_campaign_feed()
 RETURNS TABLE(id uuid, title text, kpi_target text, per_clipper_ceiling numeric, rate_per_1000_views numeric, slots integer, slots_taken integer, ends_at timestamp with time zone, status campaign_status, joined boolean, is_inhouse boolean, min_followers integer, early_access_until timestamp with time zone, can_join boolean, clipper_pool numeric, spent numeric)
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
         COALESCE((SELECT SUM(cs.earnings) FROM public.clip_submissions cs WHERE cs.campaign_id = c.id), 0)
  FROM public.campaigns c
  WHERE auth.uid() IS NOT NULL
    AND c.status IN ('live','full')
    AND (c.ends_at IS NULL OR c.ends_at > now())
    AND (c.is_inhouse = false OR public.is_official_clipper(auth.uid()))
  ORDER BY c.is_inhouse DESC, c.created_at DESC
$function$;
REVOKE ALL ON FUNCTION public.clipper_campaign_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clipper_campaign_feed() TO authenticated;

DROP FUNCTION IF EXISTS public.clipper_campaign_brief(uuid);
CREATE FUNCTION public.clipper_campaign_brief(_campaign_id uuid)
 RETURNS TABLE(id uuid, title text, kpi_target text, caption text, hashtags text, brand_tag text, cta_link text, watermark_url text, source_file_link text, video_length_minutes numeric, per_clipper_ceiling numeric, rate_per_1000_views numeric, slots integer, slots_taken integer, ends_at timestamp with time zone, status campaign_status, joined boolean, is_inhouse boolean, min_followers integer, early_access_until timestamp with time zone, can_join boolean, cloutbase_watermark_url text, clipper_pool numeric, spent numeric)
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
         COALESCE((SELECT SUM(cs.earnings) FROM public.clip_submissions cs WHERE cs.campaign_id = c.id), 0)
  FROM public.campaigns c
  WHERE c.id = _campaign_id
    AND auth.uid() IS NOT NULL
    AND c.status IN ('live','full')
    AND (c.is_inhouse = false OR public.is_official_clipper(auth.uid()))
$function$;
REVOKE ALL ON FUNCTION public.clipper_campaign_brief(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clipper_campaign_brief(uuid) TO authenticated;