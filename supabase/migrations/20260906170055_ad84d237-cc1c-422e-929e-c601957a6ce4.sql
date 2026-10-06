-- 1. Owner admins allow-list -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.owner_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.owner_admins TO authenticated;
GRANT ALL ON public.owner_admins TO service_role;

ALTER TABLE public.owner_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read owner admins"
  ON public.owner_admins FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_owner_admins_updated_at
  BEFORE UPDATE ON public.owner_admins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.owner_admins (email, note)
VALUES ('attahojochegbe1@gmail.com', 'Founder / owner admin')
ON CONFLICT (email) DO NOTHING;

-- 2. Grant owner admin roles to the founder account now -----------------------
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role
FROM auth.users u
CROSS JOIN (VALUES ('admin'::app_role), ('super_admin'::app_role)) AS r(role)
WHERE lower(u.email) IN (SELECT lower(email) FROM public.owner_admins)
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Auto-grant owner admin roles on signup ----------------------------------
CREATE OR REPLACE FUNCTION public.grant_owner_admin_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.owner_admins o WHERE lower(o.email) = lower(NEW.email))
  THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role), (NEW.id, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_owner_admin_on_signup() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created_owner_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_owner_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin_on_signup();

-- 4. Payment provider is no longer Paystack-specific --------------------------
ALTER TABLE public.paystack_config
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_label TEXT;

ALTER TABLE public.paystack_config
  DROP CONSTRAINT IF EXISTS paystack_config_provider_check;
ALTER TABLE public.paystack_config
  ADD CONSTRAINT paystack_config_provider_check
  CHECK (provider IN ('manual', 'paystack', 'flutterwave', 'stripe', 'other'));

UPDATE public.paystack_config SET provider = 'manual' WHERE provider IS NULL;
