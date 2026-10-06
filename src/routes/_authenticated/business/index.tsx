import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { supabase } from "@/integrations/supabase/client";
import { PayoutBreakdown } from "@/components/PayoutBreakdown";
import { formatNaira, type PayoutStats } from "@/lib/campaign";

export const Route = createFileRoute("/_authenticated/business/")({
  head: () => ({
    meta: [
      { title: "Business dashboard — Cloutbase" },
      {
        name: "description",
        content: "Track your Cloutbase clipping campaigns, budgets in Naira and review status.",
      },
      { property: "og:title", content: "Business dashboard — Cloutbase" },
      { property: "og:description", content: "Your clipping campaigns and Naira budgets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BusinessDashboard,
});

const STATUS_LABEL: Record<string, string> = {
  pending_review: "In review",
  live: "Live",
  rejected: "Rejected",
  full: "Slots full",
  ended: "Ended",
};

function BusinessDashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns", "brand", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id, title, budget, clipper_pool, status, funded, ends_at, slots, kpi_target, created_at",
        )
        .eq("brand_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["campaign-payout-stats", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_payout_stats")
        .select(
          "campaign_id, clipper_pool, per_clipper_ceiling, slots, rate_per_1000_views, spent, pool_remaining, total_views, slots_taken, clippers_maxed, slots_maxed_out",
        )
        .eq("brand_user_id", user.id);
      if (error) throw error;
      const map = new Map<string, PayoutStats>();
      for (const row of data ?? []) {
        map.set(row.campaign_id as string, row as unknown as PayoutStats);
      }
      return map;
    },
  });

  const totalPool = (campaigns ?? []).reduce((sum, c) => sum + Number(c.clipper_pool ?? 0), 0);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-28 pt-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <button
          onClick={signOut}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </header>

      <p className="mt-10 text-sm text-muted-foreground">Business account</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your campaigns</h1>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <p className="text-sm text-muted-foreground">Total clipper pool</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-money">
          {formatNaira(totalPool)}
        </p>
      </div>

      <Link
        to="/business/new"
        className="mt-4 block rounded-xl bg-foreground px-4 py-4 text-center text-sm font-semibold text-background"
      >
        Create a campaign
      </Link>

      <Link
        to="/university"
        className="mt-3 flex items-center justify-between rounded-2xl border border-border p-5 text-sm hover:border-foreground"
      >
        <span>
          Cloutbase University
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Courses on growing and selling with content
          </span>
        </span>
        <span className="text-xs text-muted-foreground">Browse →</span>
      </Link>



      <section className="mt-8 space-y-3 pb-10">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (campaigns?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No campaigns yet. Create one and fund it — Cloutbase reviews it before it goes live.
          </div>
        )}
        {campaigns?.map((c) => (
          <article key={c.id} className="rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">{c.title}</h2>
              <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
            </div>
            <p className="mt-3 text-lg font-semibold tracking-tight text-money">
              {formatNaira(Number(c.clipper_pool ?? 0))}
              <span className="ml-1 text-xs font-normal text-muted-foreground">clipper pool</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Budget {formatNaira(Number(c.budget ?? 0))} · {c.slots} slots
              {c.kpi_target ? ` · ${c.kpi_target}` : ""}
              {c.ends_at
                ? ` · ends ${new Date(c.ends_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                  })}`
                : ""}
            </p>
            {stats?.get(c.id) && <PayoutBreakdown stats={stats.get(c.id)!} />}
          </article>
        ))}
      </section>
      <TabBar role="business" />
    </main>
  );
}
