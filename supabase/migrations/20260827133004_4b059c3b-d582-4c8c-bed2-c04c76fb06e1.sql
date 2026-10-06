-- 1. Storage: restrict campaign asset reads to the owning brand folder or admins
DROP POLICY IF EXISTS "Authenticated can read campaign assets" ON storage.objects;

CREATE POLICY "Owner or admin reads campaign assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);

-- 2. Profiles: stop exposing emails publicly
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin(auth.uid()));

REVOKE SELECT ON public.profiles FROM anon;

-- Non-sensitive public directory (no email)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, username, account_type, created_at
FROM public.profiles;

ALTER VIEW public.public_profiles SET (security_invoker = false);

GRANT SELECT ON public.public_profiles TO anon, authenticated;
GRANT SELECT ON public.public_profiles TO service_role;