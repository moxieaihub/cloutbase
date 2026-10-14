import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { CampaignReviewCard } from "@/features/admin/components/CampaignReviewCard";
import { useCampaignAnalytics, useReviewQueue, type CampaignRow } from "@/features/admin/queries";
import { formatNaira } from "@/lib/campaign";
import { formatViews } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/campaigns/")({
  head: () => ({
    meta: [
      { title: "Campaigns — Cloutbase admin" },
      { name: "description", content: "Accept or decline funded campaigns and watch live ones." },
    ],
  }),
  component: Campaigns,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading campaigns.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

type Tab = "awaiting" | "live" | "all";

function Campaigns() {
  const [tab, setTab] = useState<Tab>("awaiting");
  const { data: queue, isLoading } = useReviewQueue();
  const { data: all } = useCampaignAnalytics();

  const live = (all ?? []).filter((c) => c.status === "live" || c.status === "full");
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "awaiting", label: "Awaiting approval", count: (queue ?? []).length },
    { id: "live", label: "Live", count: live.length },
    { id: "all", label: "All", count: (all ?? []).length },
  ];

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Campaigns</h1>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Only funded campaigns reach the approval queue. Accepting sets the campaign live and starts its
        deadline; declining needs a reason. The brand is emailed either way.
      </p>

      <nav className="mt-6 flex gap-5 border-b border-border text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 pb-3 ${
              tab === t.id ? "border-[#4DA3FF] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} <span className="text-xs text-muted-2">{t.count}</span>
          </button>
        ))}
      </nav>

      {tab === "awaiting" ? (
        isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : (queue ?? []).length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Nothing awaiting approval.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {(queue ?? []).map((c) => (
              <CampaignReviewCard key={c.id} campaign={c} />
            ))}
          </ul>
        )
      ) : (
        <CampaignList rows={tab === "live" ? live : (all ?? [])} />
      )}
    </AdminShell>
  );
}

function CampaignList({ rows }: { rows: CampaignRow[] }) {
  if (rows.length === 0) return <p className="mt-8 text-sm text-muted-foreground">No campaigns here yet.</p>;
  return (
    <div className="mt-6 space-y-3">
      {rows.map((c) => (
        <Link
          key={c.id}
          to="/admin/campaigns/$campaignId"
          params={{ campaignId: c.id }}
          className="block rounded-2xl border border-border p-4 hover:border-foreground/40"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{c.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.brand_username ?? c.brand_email} · {c.status} · {Number(c.slots_taken)}/{Number(c.slots)} slots
              </p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted-foreground">
              <p>{formatViews(Number(c.total_views))} views</p>
              <p className="text-price">{formatNaira(Number(c.budget))}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
