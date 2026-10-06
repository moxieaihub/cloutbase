
-- 1. Terms & conditions acceptance log ---------------------------------------
CREATE TABLE public.terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('clipper_signup','business_signup','campaign_rules')),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT 'v1',
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX terms_acceptances_campaign_uniq
  ON public.terms_acceptances (user_id, campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX terms_acceptances_user_idx ON public.terms_acceptances (user_id);

GRANT SELECT, INSERT ON public.terms_acceptances TO authenticated;
GRANT ALL ON public.terms_acceptances TO service_role;
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users record their own acceptance" ON public.terms_acceptances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users read their own acceptance" ON public.terms_acceptances
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 2. Ban register + strike log ------------------------------------------------
CREATE TABLE public.banned_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  username text,
  device_signal text,
  user_id uuid,
  reason text NOT NULL,
  banned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX banned_identities_email_idx ON public.banned_identities (lower(email));
CREATE INDEX banned_identities_username_idx ON public.banned_identities (lower(username));
CREATE INDEX banned_identities_device_idx ON public.banned_identities (device_signal);

GRANT SELECT ON public.banned_identities TO authenticated;
GRANT ALL ON public.banned_identities TO service_role;
ALTER TABLE public.banned_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read ban register" ON public.banned_identities
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.strike_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('strike','ban','unban')),
  reason text NOT NULL,
  admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX strike_log_user_idx ON public.strike_log (user_id);
GRANT SELECT ON public.strike_log TO authenticated;
GRANT ALL ON public.strike_log TO service_role;
ALTER TABLE public.strike_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin strike history" ON public.strike_log
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- device / identity signal captured at signup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_signal text;

-- 3. Referral codes -----------------------------------------------------------
ALTER TABLE public.clipper_profiles ADD COLUMN IF NOT EXISTS referral_code text;

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public AS $$
  SELECT upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 7))
$$;

UPDATE public.clipper_profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;
ALTER TABLE public.clipper_profiles ALTER COLUMN referral_code SET DEFAULT public.gen_referral_code();
CREATE UNIQUE INDEX IF NOT EXISTS clipper_profiles_referral_code_uniq ON public.clipper_profiles (referral_code);

-- returns (and creates if needed) the caller's referral code
CREATE OR REPLACE FUNCTION public.my_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _code text; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.clipper_profiles (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT referral_code INTO _code FROM public.clipper_profiles WHERE user_id = _uid;
  IF _code IS NULL THEN
    UPDATE public.clipper_profiles SET referral_code = public.gen_referral_code()
     WHERE user_id = _uid RETURNING referral_code INTO _code;
  END IF;
  RETURN _code;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_referral(_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _ref uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF COALESCE(btrim(_code),'') = '' THEN RETURN; END IF;
  SELECT user_id INTO _ref FROM public.clipper_profiles
   WHERE upper(referral_code) = upper(btrim(_code));
  IF _ref IS NULL OR _ref = _uid THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = _uid) THEN RETURN; END IF;

  INSERT INTO public.referrals (referrer_user_id, referred_user_id) VALUES (_ref, _uid);
  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_ref, 'Someone signed up with your referral link.', 'referral');
END;
$$;

CREATE OR REPLACE FUNCTION public.my_referral_stats()
RETURNS TABLE(code text, total integer, joined_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cp.referral_code,
         (SELECT COUNT(*)::int FROM public.referrals r WHERE r.referrer_user_id = cp.user_id),
         (SELECT MAX(r.created_at) FROM public.referrals r WHERE r.referrer_user_id = cp.user_id)
  FROM public.clipper_profiles cp WHERE cp.user_id = auth.uid()
$$;

-- 4. Signup gate: banned identities cannot re-register ------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _username text; _device text;
BEGIN
  _username := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'username',''), 'user_' || left(NEW.id::text,8));
  _device := NULLIF(NEW.raw_user_meta_data ->> 'device_signal','');

  IF EXISTS (
    SELECT 1 FROM public.banned_identities b
    WHERE (b.email IS NOT NULL AND lower(b.email) = lower(COALESCE(NEW.email,'')))
       OR (b.username IS NOT NULL AND lower(b.username) = lower(_username))
       OR (b.device_signal IS NOT NULL AND _device IS NOT NULL AND b.device_signal = _device)
  ) THEN
    RAISE EXCEPTION 'This identity is banned from Cloutbase and cannot register again.';
  END IF;

  INSERT INTO public.profiles (id, username, account_type, email, device_signal)
  VALUES (
    NEW.id, _username,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'account_type',''), 'clipper')::public.account_type,
    NEW.email, _device
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'account_type',''),'clipper')::text::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- 5. Admin ban / strike -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_ban_clipper(_user_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _p record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF COALESCE(btrim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO _p FROM public.profiles WHERE id = _user_id;
  IF _p IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;

  INSERT INTO public.clipper_profiles (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.clipper_profiles
     SET banned = true, is_approved = false, is_priority = false, is_inhouse = false
   WHERE user_id = _user_id;

  UPDATE public.campaign_slots SET released = true, released_at = now()
   WHERE clipper_user_id = _user_id AND released = false;

  INSERT INTO public.banned_identities (email, username, device_signal, user_id, reason, banned_by)
  VALUES (_p.email, _p.username, _p.device_signal, _user_id, btrim(_reason), auth.uid());

  INSERT INTO public.strike_log (user_id, kind, reason, admin_id)
  VALUES (_user_id, 'ban', btrim(_reason), auth.uid());

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_user_id, 'Your Cloutbase account has been banned: ' || btrim(_reason), 'banned');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unban_clipper(_user_id uuid, _reason text DEFAULT 'Reinstated')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.clipper_profiles SET banned = false WHERE user_id = _user_id;
  DELETE FROM public.banned_identities WHERE user_id = _user_id;
  INSERT INTO public.strike_log (user_id, kind, reason, admin_id)
  VALUES (_user_id, 'unban', COALESCE(NULLIF(btrim(_reason),''),'Reinstated'), auth.uid());
  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_user_id, 'Your Cloutbase account has been reinstated.', 'unbanned');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_strike(_user_id uuid, _reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _strikes int;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF COALESCE(btrim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  INSERT INTO public.clipper_profiles (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.clipper_profiles SET strikes = strikes + 1 WHERE user_id = _user_id
    RETURNING strikes INTO _strikes;
  INSERT INTO public.strike_log (user_id, kind, reason, admin_id)
  VALUES (_user_id, 'strike', btrim(_reason), auth.uid());
  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_user_id, 'You received a strike: ' || btrim(_reason), 'strike');
  RETURN _strikes;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_ban_log()
RETURNS TABLE(user_id uuid, username text, email text, kind text, reason text, at timestamptz, banned boolean, strikes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.user_id, p.username, p.email, s.kind, s.reason, s.created_at,
         COALESCE(cp.banned,false), COALESCE(cp.strikes,0)
  FROM public.strike_log s
  JOIN public.profiles p ON p.id = s.user_id
  LEFT JOIN public.clipper_profiles cp ON cp.user_id = s.user_id
  WHERE public.is_admin(auth.uid())
  ORDER BY s.created_at DESC
$$;

-- 6. Campaign rules gate on joining ------------------------------------------
CREATE OR REPLACE FUNCTION public.join_campaign(_campaign_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _c record;
  _taken int;
  _slot_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'clipper') THEN
    RAISE EXCEPTION 'Only clippers can join campaigns';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clipper_profiles WHERE user_id = _uid AND banned) THEN
    RAISE EXCEPTION 'Your account is banned';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.terms_acceptances t
    WHERE t.user_id = _uid AND t.campaign_id = _campaign_id
  ) THEN
    RAISE EXCEPTION 'Accept the campaign rules before joining';
  END IF;

  SELECT * INTO _c FROM public.campaigns WHERE id = _campaign_id FOR UPDATE;
  IF _c IS NULL THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  IF _c.status <> 'live' THEN RAISE EXCEPTION 'Campaign is not accepting clippers'; END IF;

  IF _c.is_inhouse AND NOT public.is_official_clipper(_uid) THEN
    RAISE EXCEPTION 'In-house campaigns are for approved Official Clippers only';
  END IF;

  IF NOT public.clipper_can_join(_campaign_id, _uid) THEN
    IF _c.is_inhouse THEN
      RAISE EXCEPTION 'You do not meet the requirement for this in-house campaign';
    ELSE
      RAISE EXCEPTION 'Official Clippers get early access — this campaign opens to everyone shortly';
    END IF;
  END IF;

  SELECT COUNT(*) INTO _taken FROM public.campaign_slots
   WHERE campaign_id = _campaign_id AND released = false;
  IF _taken >= _c.slots THEN
    UPDATE public.campaigns SET status = 'full' WHERE id = _campaign_id;
    RAISE EXCEPTION 'Campaign is full';
  END IF;

  INSERT INTO public.campaign_slots (campaign_id, clipper_user_id)
  VALUES (_campaign_id, _uid)
  ON CONFLICT DO NOTHING
  RETURNING id INTO _slot_id;

  IF _slot_id IS NULL THEN
    SELECT id INTO _slot_id FROM public.campaign_slots
     WHERE campaign_id = _campaign_id AND clipper_user_id = _uid AND released = false;
  END IF;

  IF _taken + 1 >= _c.slots THEN
    UPDATE public.campaigns SET status = 'full' WHERE id = _campaign_id;
  END IF;

  RETURN _slot_id;
END;
$$;

-- 7. New-campaign notifications: priority group first -------------------------
CREATE OR REPLACE FUNCTION public.notify_campaign_live()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _hours int := COALESCE(NEW.early_access_hours, 0);
BEGIN
  IF NEW.status = 'live' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'live') THEN
    -- priority / official clippers first
    INSERT INTO public.notifications (user_id, message, type)
    SELECT cp.user_id,
           'New campaign live now: "' || NEW.title || '" — Official Clipper early access is open.',
           'campaign_new'
    FROM public.clipper_profiles cp
    WHERE cp.banned = false AND (cp.is_priority OR cp.is_approved);

    IF NOT NEW.is_inhouse THEN
      INSERT INTO public.notifications (user_id, message, type)
      SELECT ur.user_id,
             CASE WHEN _hours > 0
               THEN 'New campaign "' || NEW.title || '" opens to everyone in ' || _hours || ' hours.'
               ELSE 'New campaign live: "' || NEW.title || '".' END,
             'campaign_new'
      FROM public.user_roles ur
      LEFT JOIN public.clipper_profiles cp ON cp.user_id = ur.user_id
      WHERE ur.role = 'clipper'
        AND COALESCE(cp.banned,false) = false
        AND NOT COALESCE(cp.is_priority,false)
        AND NOT COALESCE(cp.is_approved,false);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS campaigns_notify_live ON public.campaigns;
CREATE TRIGGER campaigns_notify_live
AFTER INSERT OR UPDATE OF status ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.notify_campaign_live();

-- 8. Enforce the 5-day-live rule at payout ------------------------------------
CREATE OR REPLACE FUNCTION public.admin_release_payout(_clipper_user_id uuid, _reference text DEFAULT NULL::text, _note text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cp record;
  _amount numeric;
  _payout_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admins only'; END IF;

  SELECT * INTO _cp FROM public.clipper_profiles WHERE user_id = _clipper_user_id;
  IF _cp IS NULL THEN RAISE EXCEPTION 'Clipper profile not found'; END IF;
  IF COALESCE(_cp.banned,false) THEN RAISE EXCEPTION 'Clipper is banned — payout blocked'; END IF;

  IF COALESCE(_cp.real_name,'') = '' OR COALESCE(_cp.bank_name,'') = ''
     OR COALESCE(_cp.bank_account_number,'') = '' OR COALESCE(_cp.account_name,'') = '' THEN
    RAISE EXCEPTION 'Payment details incomplete — payout blocked';
  END IF;

  IF NOT public.payout_name_matches(_cp.real_name, _cp.account_name) THEN
    RAISE EXCEPTION 'Account name does not match real name — payout blocked';
  END IF;

  SELECT COALESCE(SUM(earnings), 0) INTO _amount
  FROM public.clip_submissions
  WHERE clipper_user_id = _clipper_user_id AND paid = false AND earnings > 0
    AND deleted_before_snapshot = false
    AND counts_from IS NOT NULL AND counts_from <= now();

  IF _amount <= 0 THEN RAISE EXCEPTION 'Nothing to pay out — no clips have completed the 5-day live rule'; END IF;

  INSERT INTO public.payouts (clipper_user_id, amount, status, released_by_admin_id, released_at, note, transfer_reference)
  VALUES (_clipper_user_id, _amount, 'paid', auth.uid(), now(), _note, _reference)
  RETURNING id INTO _payout_id;

  UPDATE public.clip_submissions
     SET paid = true, paid_at = now()
   WHERE clipper_user_id = _clipper_user_id AND paid = false AND earnings > 0
     AND deleted_before_snapshot = false
     AND counts_from IS NOT NULL AND counts_from <= now();

  UPDATE public.payouts SET status = 'paid', released_at = now(), released_by_admin_id = auth.uid()
   WHERE clipper_user_id = _clipper_user_id AND status = 'held';

  INSERT INTO public.notifications (user_id, message, type)
  VALUES (_clipper_user_id, 'Your payout of ₦' || to_char(_amount, 'FM999,999,999.00') || ' has been released.', 'payout_paid');

  RETURN _payout_id;
END;
$$;
