DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname <> 'public_recent_payouts'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;

-- Re-grant execute to signed-in users only for the functions the app calls.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (p.proname LIKE 'admin\_%' OR p.proname LIKE 'brand\_%' OR p.proname LIKE 'clipper\_%'
           OR p.proname LIKE 'super\_admin\_%'
           OR p.proname IN ('join_campaign','apply_inhouse_clipper','my_referral_code','my_referral_stats',
                            'record_referral','has_role','is_admin','is_official_clipper','owns_campaign',
                            'has_active_slot','payout_name_matches','rank_daily_limit','rank_for_views',
                            'slots_for_budget','campaign_slots_taken','next_friday'))
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.public_recent_payouts(integer) TO anon, authenticated;