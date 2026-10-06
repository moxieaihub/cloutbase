
REVOKE EXECUTE ON FUNCTION public.is_official_clipper(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apply_inhouse_clipper(integer, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_clipper_applications() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_approve_clipper(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_reject_clipper(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.clipper_can_join(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.clipper_campaign_feed() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.clipper_campaign_brief(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_create_inhouse_campaign(text, text, numeric, numeric, integer, numeric, integer, text, text, text, text, text, integer) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.is_official_clipper(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_inhouse_clipper(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_clipper_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_clipper(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_clipper(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clipper_can_join(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clipper_campaign_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clipper_campaign_brief(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_inhouse_campaign(text, text, numeric, numeric, integer, numeric, integer, text, text, text, text, text, integer) TO authenticated;
