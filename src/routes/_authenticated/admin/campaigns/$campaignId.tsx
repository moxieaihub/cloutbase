import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { ApplicationCard } from "@/features/admin/components/ApplicationCard";
import { RosterTable } from "@/features/admin/components/RosterTable";
import { StatCard } from "@/features/admin/components/StatCard";
import {
  useCampaignAnalytics,
  useCampaignRoster,
  useSlotApplications,
} from "@/features/admin/queries";
import { formatNaira } from "@/lib/campaign";
import { formatViews } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/campaigns/$campaignId")({
  head: () => ({
    meta: [
      { title: "Campaign — Cloutbase admin" },
      { name: "description", content: "Applicants, accepted clippers and delivery for one campaign." },
    ],
  }),
  component: CampaignDetail,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading this campaign.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Campaign not found.</p>
    </AdminShell>
  ),
});

function CampaignDetail() {
  const { campaignId } = Route.useParams();
  const { data: campaigns, isLoading } = useCampaignAnalytics();
  const { data: roster } = useCampaignRoster(campaignId);
  const { data: applications } = useSlotApplications(campaignId);

  const campaign = (campaigns ?? []).find((c) => c.id === campaignId);

  if (isLoading) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Loading campaign…</p>
      </AdminShell>
    );
  }
  if (!campaign) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
      </AdminShell>
    );
  }

  const full = Number(campaign.slots_taken) >= Number(campaign.slots);

  return (
    <AdminShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{campaign.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {campaign.brand_username ?? campaign.brand_email} · {campaign.status}
          </p>
        </div>
        <Link
          to="/admin/campaigns"
          className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          All campaigns
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Confirmed views" value={formatViews(Number(campaign.total_views))} />
        <StatCard label="Budget" value={formatNaira(Number(campaign.budget))} money />
        <StatCard label="Paid to clippers so far" value={formatNaira(Number(campaign.spent))} money />
        <StatCard label="Slots" value={`${Number(campaign.slots_taken)} / ${Number(campaign.slots)}`} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Slot applications ({(applications ?? []).length})
        </h2>
        {full ? <p className="mt-2 text-xs text-muted-foreground">All slots are filled.</p> : null}
        {(applications ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No clippers are waiting on this campaign.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {(applications ?? []).map((a) => (
              <ApplicationCard key={a.application_id} app={a} showCampaign={false} />
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8">
        <RosterTable rows={roster ?? []} campaignTitle={campaign.title} />
      </div>
    </AdminShell>
  );
}
