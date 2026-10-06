-- 1. Campaign money split
CREATE OR REPLACE FUNCTION public.set_campaign_split()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.commission_amount := round(COALESCE(NEW.budget,0) * 0.20, 2);
  NEW.reserve_amount := round(COALESCE(NEW.budget,0) * 0.20, 2);
  NEW.clipper_pool := COALESCE(NEW.budget,0) - NEW.commission_amount - NEW.reserve_amount;
  NEW.per_clipper_ceiling := CASE
    WHEN COALESCE(NEW.slots,0) > 0 THEN round(NEW.clipper_pool / NEW.slots, 2)
    ELSE 0 END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_set_split ON public.campaigns;
CREATE TRIGGER campaigns_set_split
BEFORE INSERT OR UPDATE OF budget, slots ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_campaign_split();

-- 2. Earnings recalculation for one clipper on one campaign
CREATE OR REPLACE FUNCTION public.recalc_clipper_earnings(_campaign_id uuid, _clipper_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
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
           CASE WHEN view_count >= 1000
                THEN round((view_count::numeric / 1000) * _rate, 2)
                ELSE 0 END AS gross,
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

CREATE OR REPLACE FUNCTION public.clip_submissions_recalc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_clipper_earnings(OLD.campaign_id, OLD.clipper_user_id);
  ELSE
    PERFORM public.recalc_clipper_earnings(NEW.campaign_id, NEW.clipper_user_id);
    IF TG_OP = 'UPDATE' AND (OLD.campaign_id, OLD.clipper_user_id) IS DISTINCT FROM (NEW.campaign_id, NEW.clipper_user_id) THEN
      PERFORM public.recalc_clipper_earnings(OLD.campaign_id, OLD.clipper_user_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS clip_submissions_recalc_earnings ON public.clip_submissions;
CREATE TRIGGER clip_submissions_recalc_earnings
AFTER INSERT OR UPDATE OR DELETE ON public.clip_submissions
FOR EACH ROW EXECUTE FUNCTION public.clip_submissions_recalc();

-- Recalculate when the campaign's rate, budget or slots change
CREATE OR REPLACE FUNCTION public.campaign_recalc_all_earnings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT clipper_user_id FROM public.clip_submissions WHERE campaign_id = NEW.id LOOP
    PERFORM public.recalc_clipper_earnings(NEW.id, r.clipper_user_id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_recalc_earnings ON public.campaigns;
CREATE TRIGGER campaigns_recalc_earnings
AFTER UPDATE OF budget, slots, rate_per_1000_views ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.campaign_recalc_all_earnings();

-- 3. Live breakdown for brand + admin
CREATE OR REPLACE VIEW public.campaign_payout_stats
WITH (security_invoker = true) AS
SELECT
  c.id AS campaign_id,
  c.brand_user_id,
  c.budget,
  c.commission_amount,
  c.reserve_amount,
  c.clipper_pool,
  c.per_clipper_ceiling,
  c.slots,
  c.rate_per_1000_views,
  COALESCE(e.spent, 0) AS spent,
  c.clipper_pool - COALESCE(e.spent, 0) AS pool_remaining,
  COALESCE(e.total_views, 0) AS total_views,
  COALESCE(s.slots_taken, 0) AS slots_taken,
  COALESCE(e.clippers_maxed, 0) AS clippers_maxed,
  (COALESCE(e.clippers_maxed, 0) >= c.slots) AS slots_maxed_out
FROM public.campaigns c
LEFT JOIN (
  SELECT campaign_id,
         SUM(earned) AS spent,
         SUM(views) AS total_views,
         COUNT(*) FILTER (WHERE earned >= ceiling AND ceiling > 0) AS clippers_maxed
  FROM (
    SELECT cs.campaign_id,
           cs.clipper_user_id,
           SUM(cs.earnings) AS earned,
           SUM(cs.view_count) AS views,
           MAX(ca.per_clipper_ceiling) AS ceiling
    FROM public.clip_submissions cs
    JOIN public.campaigns ca ON ca.id = cs.campaign_id
    GROUP BY cs.campaign_id, cs.clipper_user_id
  ) per_clipper
  GROUP BY campaign_id
) e ON e.campaign_id = c.id
LEFT JOIN (
  SELECT campaign_id, COUNT(*) AS slots_taken
  FROM public.campaign_slots WHERE released = false
  GROUP BY campaign_id
) s ON s.campaign_id = c.id;

GRANT SELECT ON public.campaign_payout_stats TO authenticated;
GRANT SELECT ON public.campaign_payout_stats TO service_role;