import { cn } from "@/lib/utils";
import { RANKS, type ClipperRank } from "@/lib/rank";

export function RankBadge({
  rank,
  className,
}: {
  rank: ClipperRank | null | undefined;
  className?: string;
}) {
  const meta = RANKS[rank ?? "rookie"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em]",
        className,
      )}
    >
      <span aria-hidden="true" className="text-slate">
        {meta.glyph}
      </span>
      {meta.label}
    </span>
  );
}
