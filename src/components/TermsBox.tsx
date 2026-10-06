export function TermsBox({
  title,
  points,
  checked,
  onChange,
  label,
}: {
  title: string;
  points: readonly string[];
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-3 space-y-2">
        {points.map((point) => (
          <li key={point} className="text-xs leading-relaxed text-muted-foreground">
            • {point}
          </li>
        ))}
      </ul>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>{label}</span>
      </label>
    </div>
  );
}
