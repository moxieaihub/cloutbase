export const MAX_CLIPS_PER_DAY_DEFAULT = 3;
export const MIN_CLIPS_PER_DAY = 1;

export const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "ig", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

export function platformLabel(value: string): string {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

/** Clipper-facing explanation of the reserve bonus pool. */
export const RESERVE_BONUS_NOTE =
  "20% of every campaign is held as a bonus reserve and paid out to clippers. Unused reserve rolls into the next bonus round — it never goes back to Cloutbase.";

export const POSTING_RULES =
  "Post up to 3 clips/day — most clippers post 5–10 clips to hit the ceiling. Clips must stay live 5 days to count.";

/** "ends in 6 days" / "ends in 4 hours" / "ended" */
export function countdown(endsAt: string | null): string {
  if (!endsAt) return "No deadline";
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `Ends in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `Ends in ${hours} hour${hours === 1 ? "" : "s"}`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `Ends in ${mins} min`;
}

export function slotsLeft(slots: number, taken: number): number {
  return Math.max(0, slots - taken);
}

/** How much of a campaign's clipper pool has been earned, 0–100. */
export function campaignProgress(spent: unknown, pool: unknown): number {
  const s = Number(spent ?? 0);
  const p = Number(pool ?? 0);
  if (!(p > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((s / p) * 100)));
}
