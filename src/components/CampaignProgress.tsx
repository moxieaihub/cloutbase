type Props = {
  /** 0–100 */
  percent: number;
  className?: string;
};

/**
 * Horizontal green completion bar for a campaign. Reflects how much of the
 * clipper pool has been earned — it grows as clips are submitted and counted,
 * and shrinks when clips are rejected or a clipper is banned.
 */
export function CampaignProgress({ percent, className }: Props) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Campaign progress</span>
        <span className="font-medium text-money">{value}% complete</span>
      </div>
      <div
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Campaign completion"
      >
        <div
          className="h-full rounded-full bg-money transition-all duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
