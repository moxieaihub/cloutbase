export type ClipperRank = "rookie" | "pro" | "elite" | "legend";

export type RankMeta = {
  label: string;
  glyph: string;
  /** Lifetime verified views needed to reach this rank. */
  threshold: number;
  dailyClips: number;
  perk: string;
};

export const RANKS: Record<ClipperRank, RankMeta> = {
  rookie: {
    label: "Rookie",
    glyph: "◆",
    threshold: 0,
    dailyClips: 3,
    perk: "Public campaigns, 3 clips a day",
  },
  pro: {
    label: "Pro",
    glyph: "◆◆",
    threshold: 100_000,
    dailyClips: 5,
    perk: "5 clips a day",
  },
  elite: {
    label: "Elite",
    glyph: "◆◆◆",
    threshold: 500_000,
    dailyClips: 8,
    perk: "8 clips a day, early campaign alerts",
  },
  legend: {
    label: "Legend",
    glyph: "★",
    threshold: 2_000_000,
    dailyClips: 12,
    perk: "12 clips a day, priority slots — clean record required",
  },
};

export const RANK_ORDER: ClipperRank[] = ["rookie", "pro", "elite", "legend"];

export function rankForViews(views: number): ClipperRank {
  if (views >= RANKS.legend.threshold) return "legend";
  if (views >= RANKS.elite.threshold) return "elite";
  if (views >= RANKS.pro.threshold) return "pro";
  return "rookie";
}

export function nextRank(rank: ClipperRank): ClipperRank | null {
  const i = RANK_ORDER.indexOf(rank);
  return i >= 0 && i < RANK_ORDER.length - 1 ? RANK_ORDER[i + 1]! : null;
}

/** 0–1 progress toward the next rank. */
export function rankProgress(views: number, rank: ClipperRank): number {
  const next = nextRank(rank);
  if (!next) return 1;
  const from = RANKS[rank].threshold;
  const to = RANKS[next].threshold;
  if (to <= from) return 1;
  return Math.min(1, Math.max(0, (views - from) / (to - from)));
}
