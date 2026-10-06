import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { TabBar } from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { sendCampaignEmail } from "@/lib/email.functions";
import { formatViews } from "@/lib/views";
import type { BrandCampaignRow } from "./index";

export const Route = createFileRoute("/_authenticated/business/analytics/$campaignId")({
  head: () => ({
    meta: [
      { title: "Campaign report — Cloutbase" },
      {
        name: "description",
        content:
          "Verified views, platform breakdown, top clips and pool spend for a single Cloutbase campaign.",
      },
      { property: "og:title", content: "Campaign report — Cloutbase" },
      {
        property: "og:description",
        content: "Delivery proof for one Cloutbase clipping campaign.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CampaignReport,
});

type ClipRow = {
  id: string;
  username: string | null;
  platform: string;
  clip_link: string;
  view_count: number;
  earnings: number;
  posted_at: string;
  paid: boolean;
};

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  ig: "Instagram",
  youtube: "YouTube",
};

function CampaignReport() {
  const { campaignId } = Route.useParams();
  const emailReport = useServerFn(sendCampaignEmail);

  const { data: campaign } = useQuery({
    queryKey: ["brand-campaign-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("brand_campaign_analytics");
      if (error) throw error;
      return (data ?? []) as unknown as BrandCampaignRow[];
    },
    select: (rows) => rows.find((r) => r.campaign_id === campaignId) ?? null,
  });

  const { data: clips } = useQuery({
    queryKey: ["brand-campaign-clips", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("brand_campaign_clips", {
        _campaign_id: campaignId,
      });
      if (error) throw error;
      return (data ?? []) as unknown as ClipRow[];
    },
  });

  const send = useMutation({
    mutationFn: async () =>
      emailReport({ data: { campaignId, kind: "performance_report" as const } }),
    onSuccess: (r) =>
      r.sent
        ? toast.success(`Report emailed to ${r.to}`)
        : toast.message("Report queued", { description: r.reason }),
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = campaign
    ? [
        { label: "TikTok", value: Number(campaign.tiktok_views ?? 0) },
        { label: "Instagram", value: Number(campaign.ig_views ?? 0) },
        { label: "YouTube", value: Number(campaign.youtube_views ?? 0) },
      ]
    : [];
  const maxPlatform = Math.max(1, ...totals.map((t) => t.value));
  const pool = Number(campaign?.clipper_pool ?? 0);
  const spent = Number(campaign?.spent ?? 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-28 pt-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link
          to="/business/analytics"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back
        </Link>
      </header>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight">
        {campaign?.title ?? "Campaign report"}
      </h1>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <p className="text-sm text-muted-foreground">Verified views</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">
          {formatViews(Number(campaign?.total_views ?? 0))}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {campaign?.clip_count ?? 0} clips from {campaign?.clipper_count ?? 0} clippers
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-border p-5">
        <p className="text-sm text-muted-foreground">Pool spent</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-money">
          {formatNaira(spent)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            of {formatNaira(pool)}
          </span>
        </p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-money"
            style={{ width: `${pool > 0 ? Math.min(100, (spent / pool) * 100) : 0}%` }}
          />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-tight">Views by platform</h2>
        <ul className="mt-3 space-y-3">
          {totals.map((t) => (
            <li key={t.label}>
              <div className="flex items-center justify-between text-xs">
                <span>{t.label}</span>
                <span className="text-muted-foreground">{formatViews(t.value)}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${(t.value / maxPlatform) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight">Top clips</h2>
        <ul className="mt-3 space-y-2">
          {(clips ?? []).length === 0 && (
            <li className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
              No clips submitted yet.
            </li>
          )}
          {(clips ?? []).map((clip) => (
            <li key={clip.id} className="rounded-xl border border-border p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <a
                  href={clip.clip_link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="truncate underline underline-offset-4"
                >
                  {clip.clip_link}
                </a>
                <span className="shrink-0 font-medium">{formatViews(Number(clip.view_count))}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                @{clip.username ?? "clipper"} · {PLATFORM_LABEL[clip.platform] ?? clip.platform}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Button className="mt-8" disabled={send.isPending} onClick={() => send.mutate()}>
        {send.isPending ? "Sending…" : "Email me this report"}
      </Button>

      <TabBar role="business" />
    </main>
  );
}
