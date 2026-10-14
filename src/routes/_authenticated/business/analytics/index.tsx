import { createFileRoute, Link } from "@tanstack/react-router";

import { BrandShell } from "@/features/brand/components/BrandShell";
import { ProgressBar } from "@/features/brand/components/ProgressBar";
import { campaignStage } from "@/features/brand/format";
import { useBrandCampaigns } from "@/features/brand/queries";
import { formatCompact } from "@/lib/campaign";

export const Route = createFileRoute("/_authenticated/business/analytics/")({
  head: () => ({
    meta: [
      { title: "Analytics — Cloutbase" },
      { name: "description", content: "Confirmed delivered views across your campaigns." },
    ],
  }),
  component: BrandAnalytics,
});

function BrandAnalytics() {
  const { data, isLoading } = useBrandCampaigns();
  const list = (data ?? []).filter((c) => c.funded);
  const confirmed = list.reduce((s, c) => s + Number(c.confirmed_views), 0);
  const pending = list.reduce((s, c) => s + Number(c.pending_views), 0);

  return (
    <BrandShell>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Analytics</h1>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
        A view only counts once its clip has stayed live for 5 full days. Nothing here is estimated.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Confirmed delivered views</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-[#4DA3FF]">{formatCompact(confirmed)}</p>
        </div>
        <div className="rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Confirming</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-muted-2">{formatCompact(pending)}</p>
          <p className="mt-1 text-[11px] text-muted-2">Clips still inside their 5-day window</p>
        </div>
      </div>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!isLoading && list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground md:col-span-2">
            No funded campaigns yet.
          </div>
        ) : null}
        {list.map((c) => (
          <Link
            key={c.campaign_id}
            to="/business/analytics/$campaignId"
            params={{ campaignId: c.campaign_id }}
            className="block rounded-2xl border border-border p-5 transition-colors hover:border-foreground/30"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-sm font-semibold">{c.title}</h2>
              <span className="shrink-0 text-[11px] text-muted-foreground">{campaignStage(c)}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {formatCompact(Number(c.confirmed_views))}
              <span className="ml-1 text-xs font-normal text-muted-foreground">confirmed views</span>
            </p>
            {Number(c.guaranteed_views) > 0 ? (
              <div className="mt-3">
                <ProgressBar confirmed={Number(c.confirmed_views)} pending={Number(c.pending_views)} target={Number(c.guaranteed_views)} />
                <p className="mt-1 text-[11px] text-muted-2">of {formatCompact(Number(c.guaranteed_views))} guaranteed</p>
              </div>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">{c.clip_count} clips · {c.clipper_count} clippers</p>
          </Link>
        ))}
      </section>
    </BrandShell>
  );
}
