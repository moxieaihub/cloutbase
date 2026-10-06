import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { formatDate } from "@/lib/payout";

type PayoutRow = { username: string; amount: number; released_at: string };

/** Social proof: real released payouts to different clippers. Never fabricated. */
export function RecentPayouts({ limit = 5 }: { limit?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["public-recent-payouts", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_recent_payouts", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as PayoutRow[];
    },
  });

  return (
    <section className="rounded-[20px] border border-border bg-card/60 p-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        Recently paid out
      </p>

      {isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading payouts…</p>
      ) : data && data.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {data.map((row, i) => (
            <li key={`${row.username}-${i}`} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-[13px] font-medium">@{row.username}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDate(row.released_at)}
                </p>
              </div>
              <span className="font-display text-sm font-semibold text-money">
                {formatNaira(Number(row.amount))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          No payouts released yet. Every Friday, verified clipper earnings are paid out in Naira
          and show up here.
        </p>
      )}
    </section>
  );
}
