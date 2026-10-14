import { Link } from "@tanstack/react-router";

import { formatCompact, formatNaira } from "@/lib/campaign";
import { weeks } from "../format";
import type { Package } from "../queries";

export function PackageCard({ pkg }: { pkg: Package }) {
  return (
    <Link
      to="/business/new"
      search={{ package: pkg.id }}
      className="flex flex-col rounded-2xl border border-border p-6 transition-colors hover:border-foreground/40"
    >
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{pkg.name}</p>
      <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#4DA3FF]">
        {formatCompact(pkg.view_range_low)}
      </p>
      <p className="text-xs text-muted-foreground">guaranteed views</p>

      <p className="mt-5 text-xl font-semibold tracking-tight text-price">{formatNaira(Number(pkg.price_to_brand))}</p>

      <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <li>{pkg.slots} clipper accounts posting</li>
        <li>TikTok · Instagram · YouTube</li>
        <li>Runs {weeks(pkg.duration_days)}</li>
      </ul>

      <span className="mt-6 block rounded-xl bg-foreground py-3 text-center text-sm font-semibold text-background">
        Choose {pkg.name}
      </span>
    </Link>
  );
}
