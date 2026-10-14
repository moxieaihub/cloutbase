import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { PlatformOverview } from "@/components/PlatformOverview";
import { QueueCard } from "@/features/admin/components/StatCard";
import {
  useClipperApplicants,
  useFlags,
  useReviewQueue,
  useSlotApplications,
} from "@/features/admin/queries";
import { formatTimestamp } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Cloutbase admin" },
      { name: "description", content: "Platform numbers and everything waiting on you." },
    ],
  }),
  component: Dashboard,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading the dashboard.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

function Dashboard() {
  const { data: queue } = useReviewQueue();
  const { data: applications } = useSlotApplications();
  const { data: clippers } = useClipperApplicants();
  const { data: flags } = useFlags();

  const pendingClippers = (clippers ?? []).filter(
    (c) => c.applied_at && !c.is_approved && !c.reject_reason && !c.banned,
  ).length;

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Control room</h1>
      <p className="mb-6 mt-2 text-xs text-muted-foreground">
        Platform-wide numbers first, then everything waiting on you.
      </p>

      <PlatformOverview />

      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Needs your attention</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <QueueCard
          label="Campaigns awaiting approval"
          count={(queue ?? []).length}
          to="/admin/campaigns"
          hint="Funded campaigns — accept or decline"
        />
        <QueueCard
          label="Slot applications"
          count={(applications ?? []).length}
          to="/admin/applications"
          hint="Clippers asking to join a campaign"
        />
        <QueueCard
          label="Clipper applicants"
          count={pendingClippers}
          to="/admin/clippers"
          hint="New clippers to vet on average views"
        />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Flags</h2>
        {(flags ?? []).length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No flags right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(flags ?? []).map((f, i) => (
              <li key={`${f.kind}-${f.campaign_id}-${f.clipper_user_id}-${i}`} className="rounded-xl border border-border p-3 text-xs">
                <p className="font-medium">
                  {f.kind === "slot_near_release" ? "Slot nearing auto-release" : "Clip under 1,000 views"}
                </p>
                <p className="mt-1 text-muted-foreground">{f.username} · {f.campaign_title}</p>
                <p className="mt-1 text-muted-foreground">{f.detail} · {formatTimestamp(f.at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
