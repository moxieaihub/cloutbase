-- 1) Profiles: remove public (unauthenticated) read access to emails/usernames
DROP POLICY IF EXISTS "Public profile fields are readable" ON public.profiles;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

REVOKE SELECT ON public.profiles FROM anon;

-- 2) Lock down SECURITY DEFINER functions: revoke from anon/authenticated, then
--    grant back only the routines the application actually calls.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
  app_fns text[] := ARRAY[
    'admin_add_strike','admin_approve_campaign','admin_approve_clipper','admin_ban_clipper',
    'admin_ban_log','admin_campaign_analytics','admin_campaign_clippers','admin_campaign_views_over_time',
    'admin_clipper_applications','admin_clipper_clips','admin_create_inhouse_campaign','admin_flags',
    'admin_hold_payout','admin_inhouse_clip_queue','admin_payout_queue','admin_platform_overview',
    'admin_reject_campaign','admin_reject_clipper','admin_release_payout','admin_review_queue',
    'admin_set_clip_watermark','admin_unban_clipper','apply_inhouse_clipper','brand_campaign_analytics',
    'brand_campaign_clips','clipper_campaign_brief','clipper_campaign_feed','is_admin','join_campaign',
    'my_referral_code','my_referral_stats','record_referral','super_admin_demote','super_admin_promote',
    'super_admin_user_list'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname = ANY(app_fns)
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

-- Public payout ticker on the login page stays available to visitors.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'public_recent_payouts'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
  END LOOP;
END $$;