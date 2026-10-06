import { cn } from "@/lib/utils";

const PLATFORMS = ["TikTok", "YouTube", "Instagram", "Facebook", "Kick", "X"];

/** Auto-scrolling row of platform chips — signals which platforms Cloutbase covers. */
export function PlatformMarquee({ className }: { className?: string }) {
  const row = [...PLATFORMS, ...PLATFORMS];

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      role="list"
      aria-label="Platforms we cover"
    >
      <div
        className="flex w-max gap-2"
        style={{ animation: "cb-marquee 22s linear infinite" }}
      >
        {row.map((name, i) => (
          <span
            key={`${name}-${i}`}
            role="listitem"
            className="whitespace-nowrap rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-[12px] tracking-wide text-muted-foreground"
          >
            {name}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}
