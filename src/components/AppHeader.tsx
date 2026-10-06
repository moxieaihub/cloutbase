import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export function AppHeader({ role = "clipper" }: { role?: "clipper" | "business" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const navLink =
    "rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground";

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-input bg-background/70 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl md:px-5">
        {role === "business" ? (
          <Link to="/business" aria-label="Cloutbase home">
            <Logo size="sm" />
          </Link>
        ) : (
          <Link to="/clipper" aria-label="Cloutbase home">
            <Logo size="sm" />
          </Link>
        )}

        <nav className="flex items-center gap-1 text-[14px]" aria-label="Main">
          <Link to="/university" className={`hidden md:inline-flex ${navLink}`}>
            University
          </Link>
          {role === "business" ? (
            <Link to="/business" className={`lg:hidden ${navLink}`}>
              Campaigns
            </Link>
          ) : (
            <Link to="/clipper" className={`lg:hidden ${navLink}`}>
              Campaigns
            </Link>
          )}
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
