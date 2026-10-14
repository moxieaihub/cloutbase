import { createFileRoute } from "@tanstack/react-router";

import { PaidBadge } from "@/components/PaidBadge";
import { RankBadge } from "@/components/RankBadge";
import { ClipperShell } from "@/features/clipper/components/ClipperShell";
import { useClipperProfile, useEarnings, usePayouts } from "@/features/clipper/queries";
import { formatNaira } from "@/lib/campaign";
import { formatDate, nextFriday } from "@/lib/payout";
import { RANKS, RANK_ORDER, nextRank, rankProgress, type ClipperRank } from "@/lib/rank";

export const Route = createFileRoute("/_authenticated/clipper/earnings")({
  head: () => ({
    meta: [
      { title: "Rank & earnings — Cloutbase" },
      { name: "description", content: "Your rank, lifetime views, earnings and payout history." },
    ],
  }),
  component: RankAndEarnings,
});

function RankAndEarnings() {
  const { user } = Route.useRouteContext();
  const { data: profile } = useClipperProfile(user.id);
  const { data: totals } = useEarnings(user.id);
  const { data: payouts } = usePayouts(user.id);

  const rank = (profile?.rank ?? "rookie") as ClipperRank;
  const lifetime = Number(profile?.lifetime_views ?? 0);
  const upcoming = nextRank(rank);
  const progress = rankProgress(lifetime, rank);

  return (
    <ClipperShell>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Rank &amp; earnings</h1>
      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
        Your rank rises with lifetime confirmed views. Payouts are released by an admin every Friday.
      </p>

      <div className="mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
        <div>
          <section className="rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between gap-3">
              <RankBadge rank={rank} />
              <span className="text-xs text-muted-foreground">{lifetime.toLocaleString("en-NG")} lifetime views</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-[#4DA3FF]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {upcoming
                ? `${Math.max(0, RANKS[upcoming].threshold - lifetime).toLocaleString("en-NG")} views to ${RANKS[upcoming].label}`
                : "You’re at the top rank."}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{RANKS[rank].perk}</p>
          </section>

          <ul className="mt-4 space-y-2">
            {RANK_ORDER.map((r) => {
              const meta = RANKS[r];
              const current = r === rank;
              return (
                <li
                  key={r}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
                    current ? "border-[#4DA3FF]/60 bg-card" : "border-border"
                  }`}
                >
                  <span>
                    <span className="font-medium">{meta.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {meta.threshold === 0 ? "Starting rank" : `${meta.threshold.toLocaleString("en-NG")}+ lifetime views`}
                    </span>
                  </span>
                  <span className="text-right text-xs text-muted-foreground">{meta.dailyClips} clips a day</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 lg:mt-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-4">
              <p className="text-[12px] text-muted-foreground">Total earned</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-price">{formatNaira(totals?.total ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <p className="text-[12px] text-muted-foreground">Awaiting payout</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-price">{formatNaira(totals?.unpaid ?? 0)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Next payout run: {formatDate(nextFriday())}</p>

          <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-muted-foreground">Payout history</h2>
          {payouts && payouts.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {payouts.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold text-price">{formatNaira(Number(p.amount))}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.status === "paid"
                        ? `Released ${formatDate(p.released_at)}`
                        : p.status === "held"
                          ? `On hold until ${formatDate(p.hold_until)}`
                          : "Pending admin review"}
                    </p>
                  </div>
                  {p.status === "paid" ? <PaidBadge /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No payouts yet.
            </p>
          )}
        </div>
      </div>
    </ClipperShell>
  );
}
