export const COMMISSION_RATE = 0.2;
export const RESERVE_RATE = 0.2;
export const DEFAULT_RATE_PER_1000_VIEWS = 100;
export const MIN_BUDGET = 50_000;
export const MAX_BUDGET = 5_000_000;

/**
 * Slots scale with budget — kept in sync with public.slots_for_budget() in the database.
 */
export function slotsForBudget(budget: number): number {
  if (budget < 100_000) return 5;
  if (budget < 300_000) return 10;
  if (budget < 700_000) return 15;
  return 20;
}

/** Legacy default; prefer slotsForBudget(budget). */
export const DEFAULT_SLOTS = 20;

export type Tier = {
  id: "starter" | "entry" | "growth" | "scale";
  name: string;
  budget: number;
  durationDays: number;
  blurb: string;
};

export const TIERS: Tier[] = [
  { id: "starter", name: "Starter", budget: 50_000, durationDays: 7, blurb: "Runs 1 week" },
  { id: "entry", name: "Entry", budget: 200_000, durationDays: 7, blurb: "Runs 1 week" },
  { id: "growth", name: "Growth", budget: 500_000, durationDays: 14, blurb: "Runs 2 weeks" },
  { id: "scale", name: "Scale", budget: 1_000_000, durationDays: 28, blurb: "Runs 4 weeks" },
];

export const KPI_TARGETS = [
  "App sign-ups / Conversions",
  "Telegram Subscribers",
  "YouTube Views",
  "YouTube Subscribers",
  "General Reach",
] as const;

export function formatNaira(value: number): string {
  return `₦${Math.round(value).toLocaleString("en-NG")}`;
}

export function formatCompact(value: number): string {
  return Math.round(value).toLocaleString("en-NG");
}

export type Estimate = {
  commission: number;
  reserve: number;
  clipperPool: number;
  estimatedViews: number;
  viewsLow: number;
  viewsHigh: number;
};

export function estimate(budget: number, ratePer1000 = DEFAULT_RATE_PER_1000_VIEWS): Estimate {
  const commission = budget * COMMISSION_RATE;
  const reserve = budget * RESERVE_RATE;
  const clipperPool = budget - commission - reserve;
  const estimatedViews = ratePer1000 > 0 ? clipperPool / (ratePer1000 / 1000) : 0;
  return {
    commission,
    reserve,
    clipperPool,
    estimatedViews,
    viewsLow: estimatedViews * 0.8,
    viewsHigh: estimatedViews * 1.2,
  };
}

export function endsAt(durationDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + durationDays);
  return d.toISOString();
}

export function isValidVideoLink(link: string): boolean {
  try {
    const url = new URL(link.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** A clip must reach this many views before it earns anything. */
export const MIN_QUALIFYING_VIEWS = 1000;

/** Ceiling a single clipper can earn on a campaign (all their clips combined). */
export function perClipperCeiling(clipperPool: number, slots: number): number {
  return slots > 0 ? clipperPool / slots : 0;
}

export function ceilingFromBudget(
  budget: number,
  slots = DEFAULT_SLOTS,
): number {
  return perClipperCeiling(estimate(budget).clipperPool, slots);
}

export function formatRate(ratePer1000: number): string {
  return `${formatNaira(ratePer1000)} per 1,000 views`;
}

export type PayoutStats = {
  clipper_pool: number;
  per_clipper_ceiling: number;
  slots: number;
  rate_per_1000_views: number;
  spent: number;
  pool_remaining: number;
  total_views: number;
  slots_taken: number;
  clippers_maxed: number;
  slots_maxed_out: boolean;
};
