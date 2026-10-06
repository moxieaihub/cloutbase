-- 1. payout extras
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS hold_until timestamptz,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS transfer_reference text;

-- 2. Paystack keys config placeholder (never stores the secret key itself)
CREATE TABLE IF NOT EXISTS public.paystack_config (
  id boolean PRIMARY KEY DEFAULT true,
  enabled boolean NOT NULL DEFAULT false,
  live_mode boolean NOT NULL DEFAULT false,
  public_key text,
  secret_key_secret_name text NOT NULL DEFAULT 'PAYSTACK_SECRET_KEY',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT paystack_config_singleton CHECK (id)
);

GRANT SELECT, UPDATE ON public.paystack_config TO authenticated;
GRANT ALL ON public.paystack_config TO service_role;

ALTER TABLE public.paystack_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read paystack config" ON public.paystack_config;
CREATE POLICY "Admins read paystack config" ON public.paystack_config
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update paystack config" ON public.paystack_config;
CREATE POLICY "Admins update paystack config" ON public.paystack_config
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.paystack_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS paystack_config_set_updated_at ON public.paystack_config;
CREATE TRIGGER paystack_config_set_updated_at
  BEFORE UPDATE ON public.paystack_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. helper: next Friday
CREATE OR REPLACE FUNCTION public.next_friday()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT date_trunc('day', now())
       + ((5 - EXTRACT(ISODOW FROM now())::int + 7 - 1) % 7 + 1) * interval '1 day'
$$;

-- 4. name matching helper
CREATE OR REPLACE FUNCTION public.payout_name_matches(_real_name text, _account_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _real_name IS NOT NULL
     AND _account_name IS NOT NULL
     AND btrim(lower(regexp_replace(_real_name, '\s+', ' ', 'g')))
       = btrim(lower(regexp_replace(_account_name, '\s+', ' ', 'g')))
$$;

-- 5. weekly admin review queue
CREATE OR REPLACE FUNCTION public.admin_payout_queue()
RETURNS TABLE(
  clipper_user_id uuid,
  username text,
  real_name text,
  bank_name text,
  bank_account_number text,
  account_name text,
  details_complete boolean,
  name_matches boolean,
  banned boolean,
  unpaid_amount numeric,
  clip_count integer,
  held_amount numeric,
  hold_until timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.user_id,
         p.username,
         cp.real_name,
         cp.bank_name,
         cp.bank_account_number,
         cp.account_name,
         (COALESCE(cp.real_name,'') <> '' AND COALESCE(cp.bank_name,'') <> ''
          AND COALESCE(cp.bank_account_number,'') <> '' AND COALESCE(cp.account_name,'') <> ''),
         public.payout_name_matches(cp.real_name, cp.account_name),
         cp.banned,
         COALESCE(u.amount, 0),
         COALESCE(u.clips, 0),
         COALESCE(h.held, 0),
         h.hold_until
  FROM public.clipper_profiles cp
  JOIN public.profiles p ON p.id = cp.user_id
  LEFT JOIN (
    SELECT clipper_user_id, SUM(earnings) AS amount, COUNT(*)::int AS clips
    FROM public.clip_submissions
    WHERE paid = false AND earnings > 0
    GROUP BY clipper_user_id
  ) u ON u.clipper_user_id = cp.user_id
  LEFT JOIN (
    SELECT clipper_user_id, SUM(amount) AS held, MIN(hold_until) AS hold_until
    FROM public.payouts WHERE status = 'held'
    GROUP BY clipper_user_id
  ) h ON h.clipper_user_id = cp.user_id
  WHERE public.is_admin(auth.uid())
    AND (COALESCE(u.amount, 0) > 0 OR COALESCE(h.held, 0) > 0)
  ORDER BY COALESCE(u.amount, 0) DESC
$$;

REVOKE ALL ON FUNCTION public.admin_payout_queue() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_payout_queue() TO authenticated;

-- 6. release payment (bookkeeping only; the actual transfer happens in Paystack)
CREATE OR REPLACE FUNCTION public.admin_release_payout(_clipper_user_id uuid, _reference text DEFAULT NULL, _note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cp record;
  _amount numeric;
  _payout_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;

  SELECT * INTO _cp FROM public.clipper_profiles WHERE user_id = _clipper_user_id;
  IF _cp IS NULL THEN RAISE EXCEPTION 'Clipper profile not found'; END IF;

  IF COALESCE(_cp.real_name,'') = '' OR COALESCE(_cp.bank_name,'') = ''
     OR COALESCE(_cp.bank_account_number,'') = '' OR COALESCE(_cp.account_name,'') = '' THEN
    RAISE EXCEPTION 'Payment details incomplete — payout blocked';
  END IF;

  IF NOT public.payout_name_matches(_cp.real_name, _cp.account_name) THEN
    RAISE EXCEPTION 'Account name does not match real name — payout blocked';
  END IF;

  SELECT COALESCE(SUM(earnings), 0) INTO _amount
  FROM public.clip_submissions WHERE clipper_user_id = _clipper_user_id AND paid = false AND earnings > 0;

  IF _amount <= 0 THEN RAISE EXCEPTION 'Nothing to pay out'; END IF;

  INSERT INTO public.payouts (clipper_user_id, amount, status, released_by_admin_id, released_at, note, transfer_reference)
  VALUES (_clipper_user_id, _amount, 'paid', auth.uid(), now(), _note, _reference)
  RETURNING id INTO _payout_id;

  UPDATE public.clip_submissions
     SET paid = true, paid_at = now()
   WHERE clipper_user_id = _clipper_user_id AND paid = false AND earnings > 0;

  UPDATE public.payouts SET status = 'paid', released_at = now(), released_by_admin_id = auth.uid()
   WHERE clipper_user_id = _clipper_user_id AND status = 'held';

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_clipper_user_id, 'Your payout of ₦' || to_char(_amount, 'FM999,999,999.00') || ' has been released.', 'payout_paid');

  RETURN _payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_release_payout(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_release_payout(uuid, text, text) TO authenticated;

-- 7. hold until Friday
CREATE OR REPLACE FUNCTION public.admin_hold_payout(_clipper_user_id uuid, _note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _amount numeric;
  _payout_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;

  SELECT COALESCE(SUM(earnings), 0) INTO _amount
  FROM public.clip_submissions WHERE clipper_user_id = _clipper_user_id AND paid = false AND earnings > 0;

  IF _amount <= 0 THEN RAISE EXCEPTION 'Nothing to hold'; END IF;

  INSERT INTO public.payouts (clipper_user_id, amount, status, hold_until, note)
  VALUES (_clipper_user_id, _amount, 'held', public.next_friday(), _note)
  RETURNING id INTO _payout_id;

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_clipper_user_id, 'Your payout is on hold until Friday.', 'payout_held');

  RETURN _payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_hold_payout(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_hold_payout(uuid, text) TO authenticated;