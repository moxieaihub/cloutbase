import { formatCompact, formatNaira, type PayoutStats } from "@/lib/campaign";

/** Live money breakdown for brands and admins. */
export function PayoutBreakdown({ stats }: { stats: PayoutStats }) {
  const pool = Number(stats.clipper_pool ?? 0);
  const spent = Number(stats.spent ?? 0);
  const remaining = Number(stats.pool_remaining ?? 0);
  const pct = pool > 0 ? Math.min(100, Math.max(0, (spent / pool) * 100)) : 0;

  return (
    <div className="mt-4 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Spent so far</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-money">
            {formatNaira(spent)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Pool remaining
          </p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-money">
            {formatNaira(remaining)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-money" style={{ width: `${pct}%` }} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
        <div>
          <dt>Slots taken</dt>
          <dd className="mt-0.5 text-xs font-medium text-foreground">
            {stats.slots_taken}/{stats.slots}
          </dd>
        </div>
        <div>
          <dt>Clippers maxed</dt>
          <dd className="mt-0.5 text-xs font-medium text-foreground">
            {stats.clippers_maxed}/{stats.slots}
          </dd>
        </div>
        <div>
          <dt>Verified views</dt>
          <dd className="mt-0.5 text-xs font-medium text-foreground">
            {formatCompact(Number(stats.total_views ?? 0))}
          </dd>
        </div>
      </dl>

      {stats.slots_maxed_out && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-[11px] font-medium">
          Every slot has hit its ceiling — the clipper pool is fully allocated.
        </p>
      )}
    </div>
  );
}
