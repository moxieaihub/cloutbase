export const MIN_FOLLOWERS_TO_APPLY = 5000;
export const OFFICIAL_MAX_CLIPS_PER_DAY = 10;

export const PERKS = [
  {
    title: "Early access to campaigns",
    body: "Official Clippers see and claim slots before everyone else. Slots run out fast.",
  },
  {
    title: "Higher daily clip limits",
    body: `Public clippers post 3 clips a day. Official Clippers post up to ${OFFICIAL_MAX_CLIPS_PER_DAY}.`,
  },
  {
    title: "Priority group",
    body: "A private notifications group — new campaigns and in-house drops announced first.",
  },
  {
    title: "Official Clipper badge",
    body: "A verified badge on your profile that brands and admins can see.",
  },
] as const;

/** "opens to everyone in 4 hours" text for the early-access window. */
export function earlyAccessCountdown(until: string | null): string | null {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `Opens to everyone in ${hours} hour${hours === 1 ? "" : "s"}`;
  const mins = Math.max(1, Math.floor(ms / 60_000));
  return `Opens to everyone in ${mins} min`;
}

export function formatFollowers(n: number): string {
  return n.toLocaleString("en-NG");
}
