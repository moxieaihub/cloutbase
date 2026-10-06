/** Monochrome "Official Clipper" badge — green stays reserved for money states. */
export function OfficialBadge({ label = "Official Clipper" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-foreground px-2.5 py-0.5 text-[11px] font-medium">
      ✦ {label}
    </span>
  );
}
