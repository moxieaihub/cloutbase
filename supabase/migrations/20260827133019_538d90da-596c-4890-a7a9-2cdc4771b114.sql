ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Column-level grants: email is not selectable through the Data API
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, username, account_type, created_at) ON public.profiles TO anon, authenticated;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Public profile fields are readable"
ON public.profiles FOR SELECT
USING (true);