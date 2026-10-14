/** Confirmed (blue) then confirming (grey) toward the guaranteed target. */
export function ProgressBar({ confirmed, pending, target }: { confirmed: number; pending: number; target: number }) {
  const c = target > 0 ? Math.min(100, (confirmed / target) * 100) : 0;
  const p = target > 0 ? Math.min(100 - c, (pending / target) * 100) : 0;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full bg-[#4DA3FF]" style={{ width: `${c}%` }} />
      <div className="h-full bg-foreground/25" style={{ width: `${p}%` }} />
    </div>
  );
}
