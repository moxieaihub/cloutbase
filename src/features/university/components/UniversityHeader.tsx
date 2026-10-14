import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { homePathFor, resolveAccountType } from "@/lib/home";

const navLink =
  "rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground";

/**
 * University header — same floating bar as the clipper/business app.
 * Clippers and businesses get a link back to their own area; students
 * (and anyone whose type is unknown) just get Sign out.
 */
export function UniversityHeader() {
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
  const accountType =
    profileType === undefined ? undefined : resolveAccountType(profileType, user);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-input bg-background/70 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl md:px-5">
        <Link to="/university/dashboard" aria-label="Cloutbase University home">
          <Logo size="sm" />
        </Link>

        <nav className="flex items-center gap-1 text-[14px]" aria-label="Main">
          {accountType === "clipper" || accountType === "business" ? (
            <Link to={homePathFor(accountType)} className={`hidden md:inline-flex ${navLink}`}>
              {accountType === "business" ? "Back to campaigns" : "Back to clipping"}
            </Link>
          ) : null}
          <button
            onClick={signOut}
            className="rounded-full border border-input px-4 py-2 font-semibold transition-colors hover:border-foreground/40"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
