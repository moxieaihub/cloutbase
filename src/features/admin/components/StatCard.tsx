import { Link } from "@tanstack/react-router";

export function StatCard({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-tight ${money ? "text-price" : ""}`}>{value}</p>
    </div>
  );
}

/** A queue tile on the dashboard: big number + where to go. */
export function QueueCard({
  label, count, to, hint,
}: {
  label: string;
  count: number;
  to: "/admin/campaigns" | "/admin/applications" | "/admin/clippers";
  hint: string;
}) {
  return (
    <Link to={to} className="block rounded-2xl border border-border p-5 transition-colors hover:border-foreground/40">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tracking-tight ${count > 0 ? "text-[#4DA3FF]" : ""}`}>{count}</p>
      <p className="mt-2 text-[11px] text-muted-2">{hint}</p>
    </Link>
  );
}
