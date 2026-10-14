import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { groupBusinesses } from "@/features/admin/businesses";
import { useCampaignAnalytics } from "@/features/admin/queries";
import { formatNaira } from "@/lib/campaign";
import { formatViews } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/businesses/")({
  head: () => ({
    meta: [
      { title: "Businesses — Cloutbase admin" },
      { name: "description", content: "Every brand on Cloutbase, their campaigns and spend." },
    ],
  }),
  component: Businesses,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading businesses.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

function Businesses() {
  const { data, isLoading } = useCampaignAnalytics();
  const businesses = groupBusinesses(data ?? []);

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Businesses</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Every brand, with how many campaigns they’ve run and what they’ve put in.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : businesses.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No businesses yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-normal">Business</th>
                <th className="px-4 py-3 font-normal">Campaigns</th>
                <th className="px-4 py-3 font-normal">Spend</th>
                <th className="px-4 py-3 font-normal">Views delivered</th>
                <th className="px-4 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.key} className="border-t border-border hover:bg-secondary/40">
                  <td className="px-4 py-3">
                    <Link to="/admin/businesses/$brandKey" params={{ brandKey: b.key }} className="font-medium underline-offset-4 hover:underline">
                      {b.name}
                    </Link>
                    {b.email ? <p className="mt-0.5 text-[11px] text-muted-foreground">{b.email}</p> : null}
                  </td>
                  <td className="px-4 py-3">{b.campaigns.length}</td>
                  <td className="px-4 py-3 text-price">{formatNaira(b.budget)}</td>
                  <td className="px-4 py-3">{formatViews(b.views)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.live > 0 ? `${b.live} live` : "Idle"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
