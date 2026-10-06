/** View tracking helpers — 5-day snapshot rule. */

export const SNAPSHOT_DAYS = 5;

export type ViewSource = "manual" | "scraper";

export const VIEW_SOURCE_LABELS: Record<ViewSource, string> = {
  manual: "Manual (admin)",
  scraper: "View Scraper API",
};

export function formatViews(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString("en-NG");
}

export function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type SnapshotState =
  | { kind: "void"; label: string; detail: string }
  | { kind: "pending"; label: string; detail: string }
  | { kind: "counted"; label: string; detail: string };

export function snapshotState(clip: {
  counts_from: string | null;
  deleted_before_snapshot?: boolean | null;
  is_live?: boolean | null;
  snapshot_view_count?: number | null;
  snapshot_taken_at?: string | null;
}): SnapshotState {
  if (clip.deleted_before_snapshot) {
    return {
      kind: "void",
      label: "Deleted before snapshot",
      detail: "Clip came down before the 5-day mark, so it earns nothing.",
    };
  }
  const from = clip.counts_from ? new Date(clip.counts_from).getTime() : null;
  if (from === null || Date.now() < from) {
    const days = from === null ? SNAPSHOT_DAYS : Math.ceil((from - Date.now()) / 86_400_000);
    return {
      kind: "pending",
      label: `Snapshot in ${days} day${days === 1 ? "" : "s"}`,
      detail: "Views count from the snapshot taken 5 days after posting.",
    };
  }
  return {
    kind: "counted",
    label: "Counted",
    detail: clip.snapshot_taken_at
      ? `Snapshot taken ${formatTimestamp(clip.snapshot_taken_at)}`
      : "Past the 5-day mark — views count.",
  };
}
