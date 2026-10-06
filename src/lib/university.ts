export type CourseBadge = "none" | "hot" | "popular" | "recommended";

export const BADGE_LABELS: Record<Exclude<CourseBadge, "none">, string> = {
  hot: "🔥 Hot",
  popular: "Most Popular",
  recommended: "Recommended",
};

/**
 * Turns any Google Drive file link into the /preview embed URL. Drive's preview
 * player streams the video and shows no download button.
 */
export function driveEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const raw = url.trim();
  if (!raw) return null;
  const id =
    raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/)?.[1] ??
    raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1] ??
    (/^[a-zA-Z0-9_-]{20,}$/.test(raw) ? raw : null);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  if (raw.startsWith("http")) return raw;
  return null;
}

export function starsLabel(avg: number | null | undefined, count: number | null | undefined) {
  const n = Number(count ?? 0);
  if (!n) return "No ratings yet";
  return `${Number(avg ?? 0).toFixed(1)} · ${n} rating${n === 1 ? "" : "s"}`;
}

export function starRow(avg: number | null | undefined): string {
  const rounded = Math.round(Number(avg ?? 0));
  return "★★★★★".slice(0, rounded).padEnd(5, "☆");
}
