import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { groupBusinesses } from "@/features/admin/businesses";
import { StatCard } from "@/features/admin/components/StatCard";
import { useCampaignAnalytics } from "@/features/admin/queries";
import { formatNaira } from "@/lib/campaign";
import { exportCsv, slugify } from "@/lib/export";
import { formatViews } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/businesses/$brandKey")({
  head: () => ({
    meta: [
      { title: "Business — Cloutbase admin" },
      { name: "description", content: "One brand’s campaigns, funding and delivered views." },
    ],
  }),
  component: BusinessDetail,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading this business.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Business not found.</p>
    </AdminShell>
  ),
});

function BusinessDetail() {
  const { brandKey } = Route.useParams();
  const { data, isLoading } = useCampaignAnalytics();
  const business = groupBusinesses(data ?? []).find((b) => b.key === brandKey);

  if (isLoading) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AdminShell>
    );
  }
  if (!business) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Business not found.</p>
      </AdminShell>
    );
  }

  const platform = (key: "tiktok_views" | "ig_views" | "youtube_views") =>
    business.campaigns.reduce((sum, c) => sum + Number(c[key] ?? 0), 0);

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{business.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{business.email ?? "no email"}</p>
        </div>
        <Link
          to="/admin/businesses"
          className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          All businesses
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Campaigns" value={String(business.campaigns.length)} />
        <StatCard label="Funded" value={formatNaira(business.budget)} money />
        <StatCard label="Views delivered" value={formatViews(business.views)} />
        <StatCard label="Live now" value={String(business.live)} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <StatCard label="TikTok" value={formatViews(platform("tiktok_views"))} />
        <StatCard label="Instagram" value={formatViews(platform("ig_views"))} />
        <StatCard label="YouTube" value={formatViews(platform("youtube_views"))} />
      </div>

      <section className="mt-8 rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Campaigns</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportCsv(
                `${slugify(business.name)}-campaigns`,
                [
                  { header: "Campaign", value: (c) => c.title },
                  { header: "Status", value: (c) => c.status },
                  { header: "Budget (NGN)", value: (c) => Number(c.budget) },
                  { header: "Views", value: (c) => Number(c.total_views) },
                  { header: "Clippers", value: (c) => Number(c.clipper_count) },
                  { header: "Clips", value: (c) => Number(c.clip_count) },
                  { header: "Paid to clippers (NGN)", value: (c) => Number(c.spent) },
                ],
                business.campaigns,
              )
            }
          >
            Export CSV
          </Button>
        </div>

        <ul className="mt-4 space-y-3">
          {business.campaigns.map((c) => {
            const pool = Number(c.clipper_pool) || 1;
            const pct = Math.min(100, Math.round((Number(c.spent) / pool) * 100));
            return (
              <li key={c.id}>
                <Link
                  to="/admin/campaigns/$campaignId"
                  params={{ campaignId: c.id }}
                  className="block rounded-xl border border-border p-4 hover:border-foreground/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.status} · {Number(c.clipper_count)} clippers · {Number(c.clip_count)} clips
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p>{formatViews(Number(c.total_views))} views</p>
                      <p className="text-price">{formatNaira(Number(c.budget))}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-[#4DA3FF]" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-2">{pct}% of the clipper pool paid out</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </AdminShell>
  );
}
