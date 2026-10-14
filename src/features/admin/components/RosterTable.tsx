import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/campaign";
import { exportCsv, slugify } from "@/lib/export";
import { formatViews } from "@/lib/views";
import type { RosterRow } from "../queries";

export function RosterTable({ rows, campaignTitle }: { rows: RosterRow[]; campaignTitle: string }) {
  return (
    <section className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Accepted clippers ({rows.length})</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={rows.length === 0}
          onClick={() =>
            exportCsv(
              `${slugify(campaignTitle)}-roster`,
              [
                { header: "Username", value: (r) => r.username ?? "" },
                { header: "Name", value: (r) => r.real_name ?? "" },
                { header: "Clips", value: (r) => Number(r.clip_count) },
                { header: "Views", value: (r) => Number(r.total_views) },
                { header: "Earnings (NGN)", value: (r) => Number(r.earnings) },
                { header: "Unpaid (NGN)", value: (r) => Number(r.unpaid) },
                { header: "Strikes", value: (r) => Number(r.strikes) },
              ],
              rows,
            )
          }
        >
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nobody has been accepted yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-normal">Clipper</th>
                <th className="py-2 pr-3 font-normal">Clips</th>
                <th className="py-2 pr-3 font-normal">Views</th>
                <th className="py-2 pr-3 font-normal">Earned</th>
                <th className="py-2 pr-3 font-normal">Unpaid</th>
                <th className="py-2 pr-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.clipper_user_id} className="border-t border-border">
                  <td className="py-2 pr-3">
                    @{r.username ?? "clipper"}
                    {r.real_name ? <span className="text-muted-foreground"> · {r.real_name}</span> : null}
                  </td>
                  <td className="py-2 pr-3">{Number(r.clip_count)}</td>
                  <td className="py-2 pr-3">{formatViews(Number(r.total_views))}</td>
                  <td className="py-2 pr-3 text-price">{formatNaira(Number(r.earnings))}</td>
                  <td className="py-2 pr-3">{formatNaira(Number(r.unpaid))}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {r.banned ? "Banned" : r.released ? "Released" : r.at_risk ? "At risk" : "Active"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
