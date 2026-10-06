import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { formatViews } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/business/analytics/")({
  head: () => ({
    meta: [
      { title: "Campaign analytics — Cloutbase" },
      {
        name: "description",
        content:
          "Verified views, clips delivered and pool spent across every Cloutbase campaign you fund.",
      },
      { property: "og:title", content: "Campaign analytics — Cloutbase" },
      {
        property: "og:description",
        content: "Delivery proof for your Cloutbase clipping campaigns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandAnalytics,
});

export type BrandCampaignRow = {
  campaign_id: string;
  title: string;
  status: string;
  budget: number;
  clipper_pool: number;
  per_clipper_ceiling: number;
  rate_per_1000_views: number;
  slots: number;
  slots_taken: number;
  clipper_count: number;
  clip_count: number;
  total_views: number;
  tiktok_views: number;
  ig_views: number;
  youtube_views: number;
  spent: number;
  ends_at: string | null;
  created_at: string;
};

function BrandAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ["brand-campaign-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("brand_campaign_analytics");
      if (error) throw error;
      return (data ?? []) as unknown as BrandCampaignRow[];
    },
  });

  const lifetimeViews = (data ?? []).reduce((s, r) => s + Number(r.total_views ?? 0), 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-28 pt-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/business" className="text-sm text-muted-foreground hover:text-foreground">
          Campaigns
        </Link>
      </header>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight">Analytics</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        Verified views only. Nothing here is estimated.
      </p>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <p className="text-sm text-muted-foreground">Total verified views</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{formatViews(lifetimeViews)}</p>
      </div>

      <section className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No campaigns yet.
          </div>
        )}
        {(data ?? []).map((c) => (
          <Link
            key={c.campaign_id}
            to="/business/analytics/$campaignId"
            params={{ campaignId: c.campaign_id }}
            className="block rounded-2xl border border-border p-5 transition-colors hover:border-foreground/30"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">{c.title}</h2>
              <span className="shrink-0 text-[11px] text-muted-foreground">{c.status}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {formatViews(Number(c.total_views ?? 0))}
              <span className="ml-1 text-xs font-normal text-muted-foreground">verified views</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {c.clip_count} clips · {c.clipper_count} clippers ·{" "}
              {formatNaira(Number(c.spent ?? 0))} of {formatNaira(Number(c.clipper_pool ?? 0))} pool
            </p>
          </Link>
        ))}
      </section>
      <TabBar role="business" />
    </main>
  );
}
