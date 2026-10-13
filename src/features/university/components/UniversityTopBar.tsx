import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { homePathFor } from "@/lib/home";

/**
 * University header. Clippers and businesses get a "Back" link to their own
 * area; students (who have no other area) get "Sign out" instead.
 */
export function UniversityTopBar() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: accountType } = useQuery({
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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="flex items-center justify-between">
      <Logo size="sm" />
      {accountType === undefined ? null : accountType === "student" ? (
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
