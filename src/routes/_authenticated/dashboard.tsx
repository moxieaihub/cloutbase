import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CommunityLinks } from "@/components/CommunityLinks";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cloutbase" },
      { name: "description", content: "Your Cloutbase account overview, campaigns and Naira earnings." },
      { property: "og:title", content: "Dashboard — Cloutbase" },
      { property: "og:description", content: "Your Cloutbase account overview and earnings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, account_type")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const isBusiness = profile?.account_type === "business";

  const isClipper = profile?.account_type === "clipper";

  useEffect(() => {
    if (isAdmin) return;
    if (isBusiness) navigate({ to: "/business", replace: true });
    else if (isClipper) navigate({ to: "/clipper", replace: true });
  }, [isAdmin, isBusiness, isClipper, navigate]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <button
          onClick={signOut}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </header>

      <div className="mt-10">
        <p className="text-sm text-muted-foreground">
          {isBusiness ? "Business account" : "Clipper account"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          @{profile?.username ?? "…"}
        </h1>

        <div className="mt-8 rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">
            {isBusiness ? "Pool balance" : "Total earned"}
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-money">
            ₦0
          </p>
        </div>

        {isAdmin ? (
          <Link
            to="/admin"
            className="mt-4 block rounded-2xl border border-border p-5 text-sm underline-offset-4 hover:underline"
          >
            View tracking &amp; reading log (admin)
          </Link>
        ) : null}

        <div className="mt-4 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          {isBusiness
            ? "Campaigns you post will show up here."
            : "Campaigns you can clip will show up here."}
        </div>

        <div className="mt-8 flex justify-center">
          <CommunityLinks variant="pill" />
        </div>
      </div>
    </main>
  );
}
