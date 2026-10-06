-- ROLES ------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('business','clipper','admin','super_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','super_admin'))
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- keep profiles in sync as the app "users" record
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, account_type, email)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'username',''), 'user_' || left(NEW.id::text,8)),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'account_type',''), 'clipper')::public.account_type,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'account_type',''),'clipper')::text::public.app_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- CLIPPER PROFILES --------------------------------------------------------
CREATE TABLE public.clipper_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  real_name text,
  bank_name text,
  bank_account_number text,
  account_name text,
  followers_count integer NOT NULL DEFAULT 0,
  avg_views integer NOT NULL DEFAULT 0,
  whatsapp text,
  is_inhouse boolean NOT NULL DEFAULT false,
  is_priority boolean NOT NULL DEFAULT false,
  is_approved boolean NOT NULL DEFAULT false,
  strikes integer NOT NULL DEFAULT 0,
  banned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clipper_profiles TO authenticated;
GRANT ALL ON public.clipper_profiles TO service_role;
ALTER TABLE public.clipper_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clippers read own clipper profile" ON public.clipper_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Clippers insert own clipper profile" ON public.clipper_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clippers update own clipper profile" ON public.clipper_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins delete clipper profiles" ON public.clipper_profiles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER clipper_profiles_set_updated_at BEFORE UPDATE ON public.clipper_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CAMPAIGNS ---------------------------------------------------------------
CREATE TYPE public.campaign_status AS ENUM ('pending_review','live','rejected','full','ended');

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_file_link text,
  video_length_minutes numeric,
  budget numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  reserve_amount numeric NOT NULL DEFAULT 0,
  clipper_pool numeric NOT NULL DEFAULT 0,
  slots integer NOT NULL DEFAULT 0,
  per_clipper_ceiling numeric NOT NULL DEFAULT 0,
  rate_per_1000_views numeric NOT NULL DEFAULT 0,
  kpi_target integer,
  caption text,
  hashtags text,
  brand_tag text,
  cta_link text,
  watermark_url text,
  duration_days integer,
  ends_at timestamptz,
  status public.campaign_status NOT NULL DEFAULT 'pending_review',
  reject_reason text,
  is_inhouse boolean NOT NULL DEFAULT false,
  funded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live campaigns visible to authenticated" ON public.campaigns FOR SELECT TO authenticated USING (status = 'live' OR auth.uid() = brand_user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Businesses create own campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = brand_user_id);
CREATE POLICY "Businesses update own campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (auth.uid() = brand_user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = brand_user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Businesses delete own campaigns" ON public.campaigns FOR DELETE TO authenticated USING (auth.uid() = brand_user_id OR public.is_admin(auth.uid()));
CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.owns_campaign(_campaign_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = _campaign_id AND c.brand_user_id = _user_id)
$$;

-- CAMPAIGN SLOTS ----------------------------------------------------------
CREATE TABLE public.campaign_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  clipper_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  first_clip_at timestamptz,
  warned_at timestamptz,
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, clipper_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_slots TO authenticated;
GRANT ALL ON public.campaign_slots TO service_role;
ALTER TABLE public.campaign_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Slots visible to owner clipper, brand, admin" ON public.campaign_slots FOR SELECT TO authenticated USING (auth.uid() = clipper_user_id OR public.owns_campaign(campaign_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Clippers claim own slot" ON public.campaign_slots FOR INSERT TO authenticated WITH CHECK (auth.uid() = clipper_user_id);
CREATE POLICY "Slot updates by clipper, brand, admin" ON public.campaign_slots FOR UPDATE TO authenticated USING (auth.uid() = clipper_user_id OR public.owns_campaign(campaign_id, auth.uid()) OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = clipper_user_id OR public.owns_campaign(campaign_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Slot deletes by clipper or admin" ON public.campaign_slots FOR DELETE TO authenticated USING (auth.uid() = clipper_user_id OR public.is_admin(auth.uid()));
CREATE TRIGGER campaign_slots_set_updated_at BEFORE UPDATE ON public.campaign_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CLIP SUBMISSIONS --------------------------------------------------------
CREATE TYPE public.clip_platform AS ENUM ('tiktok','ig','youtube');

CREATE TABLE public.clip_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  clipper_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform public.clip_platform NOT NULL,
  clip_link text NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  posted_at timestamptz NOT NULL DEFAULT now(),
  counts_from timestamptz,
  earnings numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clip_submissions TO authenticated;
GRANT ALL ON public.clip_submissions TO service_role;
ALTER TABLE public.clip_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clips visible to clipper, brand, admin" ON public.clip_submissions FOR SELECT TO authenticated USING (auth.uid() = clipper_user_id OR public.owns_campaign(campaign_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Clippers submit own clips" ON public.clip_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = clipper_user_id);
CREATE POLICY "Clip updates by clipper or admin" ON public.clip_submissions FOR UPDATE TO authenticated USING (auth.uid() = clipper_user_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = clipper_user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Clip deletes by clipper or admin" ON public.clip_submissions FOR DELETE TO authenticated USING (auth.uid() = clipper_user_id OR public.is_admin(auth.uid()));
CREATE TRIGGER clip_submissions_set_updated_at BEFORE UPDATE ON public.clip_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.set_counts_from()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.counts_from = NEW.posted_at + interval '5 days';
  RETURN NEW;
END;
$$;
CREATE TRIGGER clip_submissions_set_counts_from BEFORE INSERT OR UPDATE ON public.clip_submissions FOR EACH ROW EXECUTE FUNCTION public.set_counts_from();

-- PAYOUTS -----------------------------------------------------------------
CREATE TYPE public.payout_status AS ENUM ('pending','held','paid');

CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clipper_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  status public.payout_status NOT NULL DEFAULT 'pending',
  released_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Payouts visible to clipper and admin" ON public.payouts FOR SELECT TO authenticated USING (auth.uid() = clipper_user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins create payouts" ON public.payouts FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update payouts" ON public.payouts FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete payouts" ON public.payouts FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER payouts_set_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- REFERRALS ---------------------------------------------------------------
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);
GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrals visible to participants and admin" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Referred user records own referral" ON public.referrals FOR INSERT TO authenticated WITH CHECK (auth.uid() = referred_user_id);

-- NOTIFICATIONS -----------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- INDEXES -----------------------------------------------------------------
CREATE INDEX idx_campaigns_brand ON public.campaigns(brand_user_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_slots_clipper ON public.campaign_slots(clipper_user_id);
CREATE INDEX idx_clips_clipper ON public.clip_submissions(clipper_user_id);
CREATE INDEX idx_clips_campaign ON public.clip_submissions(campaign_id);
CREATE INDEX idx_payouts_clipper ON public.payouts(clipper_user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);