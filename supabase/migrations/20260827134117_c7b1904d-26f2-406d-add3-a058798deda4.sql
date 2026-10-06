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
           CASE
             WHEN deleted_before_snapshot THEN 0
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

REVOKE ALL ON FUNCTION public.clip_submissions_log_views() FROM PUBLIC, anon, authenticated;
