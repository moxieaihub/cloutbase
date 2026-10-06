-- 1. clip submission tracking columns
ALTER TABLE public.clip_submissions
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_before_snapshot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS snapshot_view_count integer,
  ADD COLUMN IF NOT EXISTS snapshot_taken_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

-- 2. readings log
CREATE TABLE IF NOT EXISTS public.clip_view_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_submission_id uuid NOT NULL REFERENCES public.clip_submissions(id) ON DELETE CASCADE,
  view_count integer NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  is_live boolean NOT NULL DEFAULT true,
  recorded_by uuid REFERENCES auth.users(id),
  note text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clip_view_readings_clip_idx
  ON public.clip_view_readings (clip_submission_id, recorded_at DESC);

GRANT SELECT, INSERT ON public.clip_view_readings TO authenticated;
GRANT ALL ON public.clip_view_readings TO service_role;

ALTER TABLE public.clip_view_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Readings visible to clipper, brand, admin"
  ON public.clip_view_readings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clip_submissions c
    WHERE c.id = clip_submission_id
      AND (c.clipper_user_id = auth.uid()
           OR public.owns_campaign(c.campaign_id, auth.uid())
           OR public.is_admin(auth.uid()))
  ));

CREATE POLICY "Admins record readings"
  ON public.clip_view_readings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND recorded_by = auth.uid());

-- 3. scraper config placeholder (no secrets stored here)
CREATE TABLE IF NOT EXISTS public.view_scraper_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT false,
  endpoint text,
  provider_name text,
  api_key_secret_name text NOT NULL DEFAULT 'VIEW_SCRAPER_API_KEY',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.view_scraper_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE ON public.view_scraper_config TO authenticated;
GRANT ALL ON public.view_scraper_config TO service_role;

ALTER TABLE public.view_scraper_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read scraper config"
  ON public.view_scraper_config FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins update scraper config"
  ON public.view_scraper_config FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER view_scraper_config_set_updated_at
  BEFORE UPDATE ON public.view_scraper_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. log every view_count change on clip_submissions automatically
CREATE OR REPLACE FUNCTION public.clip_submissions_log_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.view_count IS NOT DISTINCT FROM OLD.view_count
     AND NEW.is_live IS NOT DISTINCT FROM OLD.is_live THEN
    RETURN NEW;
  END IF;

  NEW.last_checked_at := now();

  -- freeze the snapshot value once the 5-day mark has passed
  IF NEW.counts_from IS NOT NULL AND now() >= NEW.counts_from AND NEW.is_live THEN
    NEW.snapshot_view_count := NEW.view_count;
    NEW.snapshot_taken_at := COALESCE(NEW.snapshot_taken_at, now());
  END IF;

  -- clip taken down before its snapshot earns nothing
  IF NOT NEW.is_live AND (NEW.counts_from IS NULL OR now() < NEW.counts_from) THEN
    NEW.deleted_before_snapshot := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clip_submissions_log_views ON public.clip_submissions;
CREATE TRIGGER clip_submissions_log_views
  BEFORE INSERT OR UPDATE ON public.clip_submissions
  FOR EACH ROW EXECUTE FUNCTION public.clip_submissions_log_views();

-- 5. earnings honour the 5-day snapshot rule
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
    FROM capped_src
  )
  SELECT 1;
END;
$$;
