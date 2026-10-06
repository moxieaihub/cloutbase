-- 1. Rank type + clipper profile columns
DO $$ BEGIN
  CREATE TYPE public.clipper_rank AS ENUM ('rookie','pro','elite','legend');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.clipper_profiles
  ADD COLUMN IF NOT EXISTS rank public.clipper_rank NOT NULL DEFAULT 'rookie',
  ADD COLUMN IF NOT EXISTS lifetime_views bigint NOT NULL DEFAULT 0;

-- 2. Linked social accounts (max 3, one per platform)
CREATE TABLE IF NOT EXISTS public.clipper_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clipper_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.clip_platform NOT NULL,
  handle text NOT NULL,
  followers integer NOT NULL DEFAULT 0,
  avg_views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clipper_user_id, platform)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clipper_accounts TO authenticated;
GRANT ALL ON public.clipper_accounts TO service_role;
ALTER TABLE public.clipper_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clipper_accounts_select_own" ON public.clipper_accounts;
CREATE POLICY "clipper_accounts_select_own" ON public.clipper_accounts
  FOR SELECT TO authenticated
  USING (clipper_user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "clipper_accounts_insert_own" ON public.clipper_accounts;
CREATE POLICY "clipper_accounts_insert_own" ON public.clipper_accounts
  FOR INSERT TO authenticated
  WITH CHECK (clipper_user_id = auth.uid());

DROP POLICY IF EXISTS "clipper_accounts_update_own" ON public.clipper_accounts;
CREATE POLICY "clipper_accounts_update_own" ON public.clipper_accounts
  FOR UPDATE TO authenticated
  USING (clipper_user_id = auth.uid())
  WITH CHECK (clipper_user_id = auth.uid());

DROP POLICY IF EXISTS "clipper_accounts_delete_own" ON public.clipper_accounts;
CREATE POLICY "clipper_accounts_delete_own" ON public.clipper_accounts
  FOR DELETE TO authenticated
  USING (clipper_user_id = auth.uid());

DROP TRIGGER IF EXISTS clipper_accounts_updated_at ON public.clipper_accounts;
CREATE TRIGGER clipper_accounts_updated_at
BEFORE UPDATE ON public.clipper_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Campaign + clip columns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS creator_name text,
  ADD COLUMN IF NOT EXISTS watermark_required boolean NOT NULL DEFAULT false;

UPDATE public.campaigns SET watermark_required = true WHERE is_inhouse = true;

ALTER TABLE public.clip_submissions
  ADD COLUMN IF NOT EXISTS clipper_account_id uuid REFERENCES public.clipper_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

UPDATE public.clip_submissions
   SET last_synced_at = COALESCE(last_synced_at, last_checked_at, updated_at);

-- 4. Slot brackets driven by budget
CREATE OR REPLACE FUNCTION public.slots_for_budget(_budget numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(_budget,0) < 100000 THEN 5
    WHEN _budget < 300000 THEN 10
    WHEN _budget < 700000 THEN 15
    ELSE 20
  END;
$$;

GRANT EXECUTE ON FUNCTION public.slots_for_budget(numeric) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_campaign_split()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.slots := public.slots_for_budget(COALESCE(NEW.budget,0));
  NEW.commission_amount := round(COALESCE(NEW.budget,0) * 0.20, 2);
  NEW.reserve_amount := round(COALESCE(NEW.budget,0) * 0.20, 2);
  NEW.clipper_pool := COALESCE(NEW.budget,0) - NEW.commission_amount - NEW.reserve_amount;
  NEW.per_clipper_ceiling := CASE
    WHEN COALESCE(NEW.slots,0) > 0 THEN round(NEW.clipper_pool / NEW.slots, 2)
    ELSE 0 END;
  RETURN NEW;
END;
$$;

UPDATE public.campaigns SET budget = budget;

-- 5. Rank-driven daily clip limits
CREATE OR REPLACE FUNCTION public.rank_daily_limit(_rank public.clipper_rank)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _rank
    WHEN 'rookie' THEN 3
    WHEN 'pro' THEN 5
    WHEN 'elite' THEN 8
    ELSE 12
  END;
$$;

GRANT EXECUTE ON FUNCTION public.rank_daily_limit(public.clipper_rank) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.clipper_daily_limit(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
           public.rank_daily_limit(COALESCE(p.rank,'rookie')),
           COALESCE(p.max_clips_per_day, 3)
         )
    FROM public.clipper_profiles p
   WHERE p.user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.clipper_daily_limit(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.clip_submissions_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit int;
  _today int;
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  IF NOT public.has_active_slot(NEW.campaign_id, NEW.clipper_user_id) THEN
    RAISE EXCEPTION 'Join the campaign before submitting clips';
  END IF;

  IF TG_OP = 'INSERT' THEN
    _limit := COALESCE(public.clipper_daily_limit(NEW.clipper_user_id), 3);

    SELECT COUNT(*) INTO _today FROM public.clip_submissions
     WHERE clipper_user_id = NEW.clipper_user_id
       AND submitted_at >= date_trunc('day', now());

    IF _today >= _limit THEN
      RAISE EXCEPTION 'Daily limit reached: % clips per day', _limit;
    END IF;

    UPDATE public.campaign_slots
       SET first_clip_at = COALESCE(first_clip_at, now()), at_risk = false
     WHERE campaign_id = NEW.campaign_id
       AND clipper_user_id = NEW.clipper_user_id
       AND released = false;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Lifetime views + automatic rank promotion
CREATE OR REPLACE FUNCTION public.rank_for_views(_views bigint)
RETURNS public.clipper_rank
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(_views,0) >= 2000000 THEN 'legend'::public.clipper_rank
    WHEN _views >= 500000 THEN 'elite'::public.clipper_rank
    WHEN _views >= 100000 THEN 'pro'::public.clipper_rank
    ELSE 'rookie'::public.clipper_rank
  END;
$$;

GRANT EXECUTE ON FUNCTION public.rank_for_views(bigint) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_clipper_rank(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _views bigint;
  _clean boolean;
  _rank public.clipper_rank;
BEGIN
  SELECT COALESCE(SUM(view_count),0) INTO _views
    FROM public.clip_submissions WHERE clipper_user_id = _user_id;

  SELECT COALESCE(strikes,0) = 0 AND COALESCE(banned,false) = false
    INTO _clean FROM public.clipper_profiles WHERE user_id = _user_id;

  _rank := public.rank_for_views(_views);
  -- "Legend" requires a clean record
  IF _rank = 'legend' AND COALESCE(_clean,false) = false THEN
    _rank := 'elite';
  END IF;

  UPDATE public.clipper_profiles
     SET lifetime_views = _views,
         rank = _rank,
         updated_at = now()
   WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_clipper_rank(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.clip_submissions_rank_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_clipper_rank(COALESCE(NEW.clipper_user_id, OLD.clipper_user_id));
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS clip_submissions_rank_sync ON public.clip_submissions;
CREATE TRIGGER clip_submissions_rank_sync
AFTER INSERT OR UPDATE OF view_count OR DELETE ON public.clip_submissions
FOR EACH ROW EXECUTE FUNCTION public.clip_submissions_rank_sync();

-- Backfill existing clippers
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.clipper_profiles LOOP
    PERFORM public.refresh_clipper_rank(r.user_id);
  END LOOP;
END $$;