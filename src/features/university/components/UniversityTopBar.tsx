import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { homePathFor, resolveAccountType } from "@/lib/home";

/**
 * University header. Clippers and businesses get a "Back" link to their own
 * area; students (and anyone whose type is unknown) get "Sign out" instead —
 * we never guess "clipper" here.
 */
export function UniversityTopBar() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profileType } = useQuery({
    queryKey: ["account-type", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.account_type ?? null;
    },
  });
  // undefined while loading; otherwise the profile type, falling back to the
  // type chosen at signup if the profile row can't be read.
  const accountType =
    profileType === undefined ? undefined : resolveAccountType(profileType, user);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="flex items-center justify-between">
      <Logo size="sm" />
      {accountType === undefined ? null : accountType !== "business" && accountType !== "clipper" ? (
        <button
          onClick={signOut}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      ) : (
        <Link
          to={homePathFor(accountType)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back
        </Link>
      )}
    </header>
  );
}
