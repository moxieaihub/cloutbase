/** Green "Paid ✓" badge — green is reserved for money states only. */
export function PaidBadge({ label = "Paid" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-money-soft px-2 py-0.5 text-[11px] font-medium text-money">
      {label} ✓
    </span>
  );
}
