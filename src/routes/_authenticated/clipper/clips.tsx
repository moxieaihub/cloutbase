import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppHeader } from "@/components/AppHeader";
import { ClipperSidebar } from "@/components/ClipperSidebar";
import { PaidBadge } from "@/components/PaidBadge";
import { TabBar } from "@/components/TabBar";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";

export const Route = createFileRoute("/_authenticated/clipper/clips")({
  head: () => ({
    meta: [
      { title: "My clips — Cloutbase" },
      {
        name: "description",
        content:
          "Every clip you submitted on Cloutbase with its platform, view count, snapshot status and Naira earnings.",
      },
      { property: "og:title", content: "My clips — Cloutbase" },
      {
        property: "og:description",
        content: "Track views, snapshot status and earnings for each clip you posted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyClips,
});

const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  ig: "Instagram",
  youtube: "YouTube",
};

function MyClips() {
  const { user } = Route.useRouteContext();

  const { data: clips, isLoading } = useQuery({
    queryKey: ["my-clips", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_submissions")
        .select(
          "id, platform, clip_link, view_count, earnings, paid, posted_at, counts_from, is_live, campaign_id, campaigns(title)",
        )
        .eq("clipper_user_id", user.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = (clips ?? []).reduce(
    (acc, c) => ({
      views: acc.views + Number(c.view_count ?? 0),
      earnings: acc.earnings + Number(c.earnings ?? 0),
    }),
    { views: 0, earnings: 0 },
  );

  return (
    <div className="min-h-screen">
      <AppHeader role="clipper" />

      <div className="mx-auto w-full max-w-md px-6 pb-28 pt-8 md:max-w-3xl md:px-8 lg:grid lg:max-w-6xl lg:grid-cols-[220px_1fr] lg:gap-10 lg:px-12 lg:pb-12 lg:pt-10">
        <ClipperSidebar />

        <main>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">My clips</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track views, snapshot status and earnings for each clip you posted.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Earned so far</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-money">
                {formatNaira(totals.earnings)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Clips must stay live 5 days before views are counted.
              </p>
            </div>
            <div className="rounded-2xl border border-border p-5">
              <p className="text-sm text-muted-foreground">Clips posted</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {(clips?.length ?? 0).toLocaleString("en-NG")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {totals.views.toLocaleString("en-NG")} views in total
              </p>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-8 text-sm text-muted-foreground">Loading your clips…</p>
          ) : clips && clips.length > 0 ? (
            <ul className="mt-8 grid gap-3 md:grid-cols-2 md:gap-4">
              {clips.map((c) => {
                const snapshotDue = c.counts_from ? new Date(c.counts_from) : null;
                const counted = snapshotDue ? snapshotDue.getTime() <= Date.now() : false;
                return (
                  <li key={c.id} className="rounded-2xl border border-border p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {(c.campaigns as { title?: string } | null)?.title ?? "Campaign"}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {PLATFORM_LABEL[c.platform] ?? c.platform} ·{" "}
                          {Number(c.view_count ?? 0).toLocaleString("en-NG")} views
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-money">
                          {formatNaira(Number(c.earnings ?? 0))}
                        </p>
                        {c.paid ? <span className="mt-1 block"><PaidBadge /></span> : null}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                      <a
                        href={c.clip_link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="truncate underline underline-offset-4 hover:text-foreground"
                      >
                        {c.clip_link}
                      </a>
                      <span className="shrink-0">
                        {c.is_live === false
                          ? "Not live"
                          : counted
                            ? "Counted"
                            : snapshotDue
                              ? `Counts ${snapshotDue.toLocaleDateString("en-NG")}`
                              : "Pending"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No clips yet. Join a campaign and post your first clip.
            </div>
          )}
        </main>
      </div>

      {/* Bottom bar stays on phones and tablets; the sidebar replaces it on desktop */}
      <div className="lg:hidden">
        <TabBar role="clipper" />
      </div>
    </div>
  );
}
