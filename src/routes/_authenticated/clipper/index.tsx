import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { EarnUpTo } from "@/components/EarnUpTo";
import { OfficialBadge } from "@/components/OfficialBadge";
import { RankBadge } from "@/components/RankBadge";
import { CampaignProgress } from "@/components/CampaignProgress";
import { TabBar } from "@/components/TabBar";
import { RANKS, nextRank, rankProgress, type ClipperRank } from "@/lib/rank";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { campaignProgress, countdown, platformLabel, slotsLeft } from "@/lib/clipper";
import { earlyAccessCountdown } from "@/lib/inhouse";


export const Route = createFileRoute("/_authenticated/clipper/")({
  head: () => ({
    meta: [
      { title: "Clipper campaigns — Cloutbase" },
      {
        name: "description",
        content:
          "Browse live Cloutbase campaigns, see how much you can earn in Naira, claim a slot and submit your clips.",
      },
      { property: "og:title", content: "Clipper campaigns — Cloutbase" },
      {
        property: "og:description",
        content: "Live clipping campaigns with Naira earning ceilings and open slots.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClipperHome,
});

function ClipperHome() {
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

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["clipper-feed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("clipper_campaign_feed");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const { data: official } = useQuery({
    queryKey: ["clipper-official", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clipper_profiles")
        .select("is_approved, max_clips_per_day, rank, lifetime_views")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const isOfficial = official?.is_approved === true;
  const rank = (official?.rank ?? "rookie") as ClipperRank;
  const lifetimeViews = Number(official?.lifetime_views ?? 0);
  const upcoming = nextRank(rank);
  const progress = rankProgress(lifetimeViews, rank);


  const { data: earnings } = useQuery({
    queryKey: ["clipper-earnings", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_submissions")
        .select("earnings, view_count")
        .eq("clipper_user_id", user.id);
      if (error) throw error;
      return {
        total: (data ?? []).reduce((s, r) => s + Number(r.earnings ?? 0), 0),
        clips: data?.length ?? 0,
        views: (data ?? []).reduce((s, r) => s + Number(r.view_count ?? 0), 0),
      };
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-28 pt-10 md:max-w-3xl md:px-8 lg:max-w-6xl lg:px-12 lg:pt-12">
      <header className="flex items-center justify-between md:border-b md:border-border md:pb-6">
        <Logo size="sm" />
        <button
          onClick={signOut}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Sign out
        </button>
      </header>

      <div className="lg:mt-10 lg:grid lg:grid-cols-[340px_1fr] lg:items-start lg:gap-10">
        {/* Left: profile, rank, earnings, shortcuts */}
        <aside className="lg:sticky lg:top-8">
          <p className="mt-10 text-sm text-muted-foreground lg:mt-0">Clipper account</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              @{profile?.username ?? "…"}
            </h1>
            {isOfficial ? <OfficialBadge /> : null}
            <RankBadge rank={rank} />
          </div>

          <div className="mt-4 rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {lifetimeViews.toLocaleString("en-NG")} lifetime views
              </span>
              <span className="text-muted-foreground">
                {upcoming ? `Next: ${RANKS[upcoming].label}` : "Top rank"}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-slate"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{RANKS[rank].perk}</p>
          </div>
          {isOfficial ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Early campaign access · up to {official?.max_clips_per_day ?? 10} clips a day · priority
              group
            </p>
          ) : null}


          <div className="mt-6 rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Total earned</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-money">
              {formatNaira(earnings?.total ?? 0)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {earnings?.clips ?? 0} clips · {(earnings?.views ?? 0).toLocaleString("en-NG")} views
            </p>
          </div>

          <Link
            to="/university"
            className="mt-4 flex items-center justify-between rounded-2xl border border-border p-5 text-sm hover:border-foreground"
          >
            <span>
              Cloutbase University
              <span className="mt-0.5 block text-xs text-muted-foreground">Learn how to earn</span>
            </span>
            <span className="text-xs text-muted-foreground">Browse courses →</span>
          </Link>

          <Link
            to="/clipper/profile"
            className="mt-4 flex items-center justify-between rounded-2xl border border-border p-5 text-sm hover:border-foreground"
          >
            <span>Payment details</span>
            <span className="text-xs text-muted-foreground">Edit any time →</span>
          </Link>
        </aside>

        {/* Right: campaigns */}
        <section>
          <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-muted-foreground lg:mt-0">
            Campaigns
          </h2>

          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading campaigns…</p>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {campaigns.map((c) => {
                const left = slotsLeft(c.slots, c.slots_taken);
                const full = left === 0;
                const early = c.joined || c.can_join ? null : earlyAccessCountdown(c.early_access_until);
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
                    <EarnUpTo
                      ceiling={Number(c.per_clipper_ceiling)}
                      ratePer1000={Number(c.rate_per_1000_views)}
                      size="lg"
                    />
                    <p className="mt-3 text-sm font-medium">{c.title}</p>
                    {(c.target_platforms ?? []).length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(c.target_platforms ?? []).map((p) => (
                          <span
                            key={p}
                            className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {platformLabel(p)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {full ? "Slots full" : `${left} of ${c.slots} slots left`}
                      </span>
                      <span>{countdown(c.ends_at)}</span>
                    </div>
                    <CampaignProgress
                      className="mt-3"
                      percent={campaignProgress(c.spent, c.clipper_pool)}
                    />
                    {c.joined ? (
                      <span className="mt-3 inline-block rounded-full border border-border px-2 py-0.5 text-[11px]">
                        Joined
                      </span>
                    ) : early ? (
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Official Clippers first · {early}
                      </p>
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

          {isOfficial ? null : (
            <Link
              to="/become-a-clipper"
              className="mt-8 block rounded-2xl border border-border p-5 hover:border-foreground"
            >
              <p className="text-sm font-medium">Become an Official Clipper</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Early access to campaigns, higher daily limits, priority group and a badge. Same rate
                for everyone.
              </p>
            </Link>
          )}
        </section>
      </div>

      <TabBar role="clipper" />
    </main>
  );
}
