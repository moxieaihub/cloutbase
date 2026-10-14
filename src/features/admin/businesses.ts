import type { CampaignRow } from "./queries";

export type Business = {
  key: string;          // brand email (falls back to username)
  name: string;
  email: string | null;
  campaigns: CampaignRow[];
  live: number;
  budget: number;
  views: number;
};

/** A "business" is every campaign sharing one brand. Built from admin_campaign_analytics. */
export function groupBusinesses(rows: CampaignRow[]): Business[] {
  const map = new Map<string, Business>();
  for (const r of rows) {
    const key = r.brand_email ?? r.brand_username ?? "unknown";
    const b =
      map.get(key) ??
      { key, name: r.brand_username ?? key, email: r.brand_email ?? null, campaigns: [], live: 0, budget: 0, views: 0 };
    b.campaigns.push(r);
    if (r.status === "live" || r.status === "full") b.live += 1;
    b.budget += Number(r.budget ?? 0);
    b.views += Number(r.total_views ?? 0);
    map.set(key, b);
  }
  return [...map.values()].sort((a, b) => b.budget - a.budget);
}
