import { createFileRoute, Link } from "@tanstack/react-router";

import { BrandShell } from "@/features/brand/components/BrandShell";
import { CampaignCard } from "@/features/brand/components/CampaignCard";
import { useBrandCampaigns, useBrandUsername } from "@/features/brand/queries";
import { formatCompact } from "@/lib/campaign";

export const Route = createFileRoute("/_authenticated/business/")({
  head: () => ({
    meta: [
      { title: "My campaigns — Cloutbase" },
      { name: "description", content: "Your campaigns and the views confirmed so far." },
    ],
  }),
  component: MyCampaigns,
});

function MyCampaigns() {
  const { user } = Route.useRouteContext();
  const { data: username } = useBrandUsername(user.id);
  const { data: campaigns, isLoading } = useBrandCampaigns();

  const list = campaigns ?? [];
  const confirmed = list.reduce((s, c) => s + Number(c.confirmed_views), 0);
  const live = list.filter((c) => c.status === "live" || c.status === "full").length;

  return (
    <BrandShell>
      <p className="text-sm text-muted-foreground">Brand account</p>
      <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight md:text-3xl">@{username ?? "…"}</h1>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-[11px] text-muted-foreground">Campaigns</p>
          <p className="mt-1 text-xl font-semibold">{list.length}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-[11px] text-muted-foreground">Live now</p>
          <p className="mt-1 text-xl font-semibold">{live}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-[11px] text-muted-foreground">Confirmed views</p>
          <p className="mt-1 text-xl font-semibold text-[#4DA3FF]">{formatCompact(confirmed)}</p>
        </div>
      </div>

      <Link
        to="/business/packages"
        className="mt-4 block rounded-xl bg-foreground px-4 py-4 text-center text-sm font-semibold text-background md:max-w-xs"
      >
        Create a campaign
      </Link>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!isLoading && list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-2">
            No campaigns yet. Pick a package to get started — Cloutbase reviews your campaign before it goes live.
          </div>
        ) : null}
        {list.map((c) => (
          <CampaignCard key={c.campaign_id} c={c} />
        ))}
      </section>
    </BrandShell>
  );
}
