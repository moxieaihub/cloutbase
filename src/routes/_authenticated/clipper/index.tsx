import { createFileRoute, Link } from "@tanstack/react-router";

import { CampaignProgress } from "@/components/CampaignProgress";
import { EarnUpTo } from "@/components/EarnUpTo";
import { OfficialBadge } from "@/components/OfficialBadge";
import { RankBadge } from "@/components/RankBadge";
import { ClipperShell } from "@/features/clipper/components/ClipperShell";
import {
  useCampaignFeed,
  useClipperProfile,
  useEarnings,
  useMyApplications,
  useUsername,
} from "@/features/clipper/queries";
import { formatNaira } from "@/lib/campaign";
import { campaignProgress, countdown, platformLabel, slotsLeft } from "@/lib/clipper";
import { earlyAccessCountdown } from "@/lib/inhouse";
import { RANKS, nextRank, rankProgress, type ClipperRank } from "@/lib/rank";

export const Route = createFileRoute("/_authenticated/clipper/")({
  head: () => ({
    meta: [
      { title: "Clipper campaigns — Cloutbase" },
      { name: "description", content: "Live campaigns with Naira earning ceilings and open slots." },
    ],
  }),
  component: ClipperHome,
});

function ClipperHome() {
  const { user } = Route.useRouteContext();
  const { data: username } = useUsername(user.id);
  const { data: profile } = useClipperProfile(user.id);
  const { data: totals } = useEarnings(user.id);
  const { data: campaigns, isLoading } = useCampaignFeed();
  const { data: applications } = useMyApplications(user.id);

  const rank = (profile?.rank ?? "rookie") as ClipperRank;
  const lifetime = Number(profile?.lifetime_views ?? 0);
  const upcoming = nextRank(rank);
  const progress = rankProgress(lifetime, rank);

  return (
    <ClipperShell>
      <p className="text-sm text-muted-foreground">Clipper account</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight md:text-3xl">
          @{username ?? "…"}
        </h1>
        {profile?.is_approved ? <OfficialBadge /> : null}
        <RankBadge rank={rank} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link to="/clipper/earnings" className="rounded-2xl border border-border p-5 transition-colors hover:border-foreground/40">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{lifetime.toLocaleString("en-NG")} lifetime views</span>
            <span>{upcoming ? `Next: ${RANKS[upcoming].label}` : "Top rank"}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-[#4DA3FF]" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{RANKS[rank].perk}</p>
        </Link>

        <Link to="/clipper/earnings" className="rounded-2xl border border-border p-5 transition-colors hover:border-foreground/40">
          <p className="text-sm text-muted-foreground">Total earned</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-price">{formatNaira(totals?.total ?? 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {totals?.clips ?? 0} clips · {(totals?.views ?? 0).toLocaleString("en-NG")} views
          </p>
        </Link>
      </div>

      <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-muted-foreground">Campaigns</h2>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading campaigns…</p>
      ) : campaigns && campaigns.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const left = slotsLeft(c.slots, c.slots_taken);
            const full = left === 0;
            const application = applications?.[c.id];
            const early = c.joined || c.can_join ? null : earlyAccessCountdown(c.early_access_until);
            const chip = c.joined
              ? "On the roster"
              : application === "applied"
                ? "Applied"
                : application === "declined"
                  ? "Not accepted"
                  : null;

            return (
              <Link
                key={c.id}
                to="/clipper/campaign/$campaignId"
                params={{ campaignId: c.id }}
                className="block rounded-2xl border border-border p-5 transition-colors hover:border-foreground"
              >
                {c.is_inhouse ? (
                  <span className="mb-3 inline-block rounded-full border border-foreground px-2 py-0.5 text-[11px] font-medium">
                    In-house · Official Clippers
                  </span>
                ) : null}
                <EarnUpTo ceiling={Number(c.per_clipper_ceiling)} ratePer1000={Number(c.rate_per_1000_views)} size="lg" />
                <p className="mt-3 text-sm font-medium">{c.title}</p>
                {(c.target_platforms ?? []).length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(c.target_platforms ?? []).map((p) => (
                      <span key={p} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {platformLabel(p)}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{full ? "Slots full" : `${left} of ${c.slots} slots left`}</span>
                  <span>{countdown(c.ends_at)}</span>
                </div>
                <CampaignProgress className="mt-3" percent={campaignProgress(c.spent, c.clipper_pool)} />
                {chip ? (
                  <span className="mt-3 inline-block rounded-full border border-[#4DA3FF]/40 px-2 py-0.5 text-[11px] text-[#4DA3FF]">
                    {chip}
                  </span>
                ) : early ? (
                  <p className="mt-3 text-[11px] text-muted-foreground">Official Clippers first · {early}</p>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          No live campaigns right now. Check back soon.
        </div>
      )}
    </ClipperShell>
  );
}
