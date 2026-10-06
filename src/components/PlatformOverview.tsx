import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { formatViews } from "@/lib/views";

type Overview = {
  lifetime_views: number;
  live_campaigns: number;
  total_campaigns: number;
  total_clippers: number;
  total_owed: number;
  total_paid: number;
  tiktok_views: number;
  ig_views: number;
  youtube_views: number;
  pending_review: number;
};

/** Platform-wide numbers at the top of the admin control room. */
export function PlatformOverview() {
  const { data } = useQuery({
    queryKey: ["admin-platform-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_platform_overview");
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as unknown as Overview | null;
    },
  });

  const platforms = [
    { label: "TikTok", value: Number(data?.tiktok_views ?? 0) },
    { label: "Instagram", value: Number(data?.ig_views ?? 0) },
    { label: "YouTube", value: Number(data?.youtube_views ?? 0) },
  ];
  const max = Math.max(1, ...platforms.map((p) => p.value));

  const cards = [
    { label: "Lifetime views", value: formatViews(Number(data?.lifetime_views ?? 0)) },
    { label: "Live campaigns", value: String(data?.live_campaigns ?? 0) },
    { label: "Owed out", value: formatNaira(Number(data?.total_owed ?? 0)), money: true },
    { label: "Paid out", value: formatNaira(Number(data?.total_paid ?? 0)), money: true },
    { label: "Clippers", value: String(data?.total_clippers ?? 0) },
    { label: "Awaiting review", value: String(data?.pending_review ?? 0) },
  ];

  return (
    <section className="mb-10">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border p-4">
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p
              className={`mt-1 text-xl font-semibold tracking-tight ${c.money ? "text-money" : ""}`}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border p-4">
        <p className="text-[11px] text-muted-foreground">Views by platform</p>
        <ul className="mt-3 space-y-2">
          {platforms.map((p) => (
            <li key={p.label}>
              <div className="flex items-center justify-between text-xs">
                <span>{p.label}</span>
                <span className="text-muted-foreground">{formatViews(p.value)}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${(p.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
