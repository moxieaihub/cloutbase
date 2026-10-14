export function weeks(days: number): string {
  const w = Math.max(1, Math.round(days / 7));
  return `${w} week${w === 1 ? "" : "s"}`;
}

export function campaignStage(c: { status: string; funded: boolean }): string {
  if (c.status === "rejected") return "Declined";
  if (c.status === "pending_review") return c.funded ? "In review" : "Awaiting payment";
  if (c.status === "live") return "Live";
  if (c.status === "full") return "Live · slots full";
  if (c.status === "ended") return "Ended";
  return c.status;
}

export const CLIP_STATE_LABEL: Record<string, string> = {
  confirmed: "Confirmed",
  confirming: "Confirming",
  removed: "Removed",
};

export const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok",
  ig: "Instagram",
  youtube: "YouTube",
};

export const fieldCls =
  "mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground";
export const labelCls = "text-sm font-medium";
