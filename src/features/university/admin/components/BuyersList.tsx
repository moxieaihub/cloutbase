import { Button } from "@/components/ui/button";
import { exportCsv, slugify } from "@/lib/export";
import { formatNaira } from "@/lib/campaign";
import { useCourseBuyers } from "../queries";

export function BuyersList({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const { data } = useCourseBuyers(courseId);
  const buyers = data ?? [];

  return (
    <section className="rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Buyers</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={buyers.length === 0}
          onClick={() =>
            exportCsv(
              `${slugify(courseTitle)}-buyers`,
              [
                { header: "Username", value: (b) => b.username ?? "" },
                { header: "Email", value: (b) => b.email ?? "" },
                { header: "Amount paid (NGN)", value: (b) => Number(b.amount_paid ?? 0) },
                { header: "Paystack ref", value: (b) => b.paystack_ref ?? "" },
                { header: "Purchased at", value: (b) => b.purchased_at ?? "" },
              ],
              buyers,
            )
          }
        >
          Export CSV
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {buyers.map((b, i) => (
          <div key={`${b.user_id}-${i}`} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">
              @{b.username ?? "user"}{" "}
              <span className="text-xs text-muted-2">{b.email}</span>
            </span>
            <span className="shrink-0 text-price">{formatNaira(Number(b.amount_paid ?? 0))}</span>
          </div>
        ))}
        {buyers.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : null}
      </div>
    </section>
  );
}
