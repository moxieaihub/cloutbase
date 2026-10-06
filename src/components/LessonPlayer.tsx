import { driveEmbedUrl } from "@/lib/university";

/**
 * Streams a lesson from Google Drive's preview embed (no download control) and
 * lays a diagonal, non-interactive watermark of the viewer's own email over it.
 */
export function LessonPlayer({
  videoUrl,
  title,
  watermark,
}: {
  videoUrl: string | null;
  title: string;
  watermark: string;
}) {
  const src = driveEmbedUrl(videoUrl);

  if (!src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
        Video coming soon
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
      <iframe
        src={src}
        title={title}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        className="h-full w-full"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        {[0, 1, 2, 3].map((row) => (
          <span
            key={row}
            className="absolute whitespace-nowrap text-[11px] font-medium tracking-wide text-white/20"
            style={{
              top: `${12 + row * 24}%`,
              left: row % 2 === 0 ? "-4%" : "12%",
              transform: "rotate(-24deg)",
            }}
          >
            {watermark} · {watermark}
          </span>
        ))}
      </div>
    </div>
  );
}
