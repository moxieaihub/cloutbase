/**
 * Full-screen, softly blurred, slowly drifting wall of platform thumbnails
 * with real brand logos and colors. Purely decorative: sits behind every
 * button and control, never interactive.
 */

import type { ReactNode } from "react";

type Tile = { label: string; bg: string; fg: string; logo: ReactNode };

const S = "h-10 w-10";

const TILES: Tile[] = [
  {
    label: "TikTok",
    bg: "#010101",
    fg: "#25F4EE",
    logo: (
      <svg viewBox="0 0 24 24" className={S} fill="currentColor" aria-hidden>
        <path d="M16.6 2h3.1c.2 1.9 1.4 3.6 3.3 4.1v3.2c-1.2 0-2.4-.4-3.4-1v6.6a6.3 6.3 0 1 1-6.3-6.3c.3 0 .7 0 1 .1v3.3a3 3 0 1 0 2.2 2.9V2z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    bg: "#E1306C",
    fg: "#FFFFFF",
    logo: (
      <svg viewBox="0 0 24 24" className={S} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    bg: "#FF0033",
    fg: "#FFFFFF",
    logo: (
      <svg viewBox="0 0 24 24" className={S} fill="currentColor" aria-hidden>
        <path d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.9 4.8 12 4.8 12 4.8s-6.9 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 4.8 2.8 2.8 0 0 0 2 2c1.6.4 8.5.4 8.5.4s6.9 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-4.8zM9.8 15.3V8.7L15.7 12l-5.9 3.3z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    bg: "#1877F2",
    fg: "#FFFFFF",
    logo: (
      <svg viewBox="0 0 24 24" className={S} fill="currentColor" aria-hidden>
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
  {
    label: "Kick",
    bg: "#53FC18",
    fg: "#0B0B0C",
    logo: (
      <svg viewBox="0 0 24 24" className={S} fill="currentColor" aria-hidden>
        <path d="M4 3h4v5.2L12.4 3H18l-5.4 6.4L18.4 21h-5.2L8 13.9V21H4V3z" />
      </svg>
    ),
  },
  {
    label: "X",
    bg: "#000000",
    fg: "#FFFFFF",
    logo: (
      <svg viewBox="0 0 24 24" className={S} fill="currentColor" aria-hidden>
        <path d="M17.8 3H21l-6.8 7.8L22.2 21h-6.3l-4.9-6.4L5.4 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3zm-1.1 16.1h1.7L7.6 4.8H5.7l11 14.3z" />
      </svg>
    ),
  },
  {
    label: "Snapchat",
    bg: "#FFFC00",
    fg: "#0B0B0C",
    logo: (
      <svg viewBox="0 0 24 24" className={S} fill="currentColor" aria-hidden>
        <path d="M12 2c3.2 0 5.5 2.4 5.5 6v2.2c.5.3 1.1.2 1.6-.1.4-.3 1-.3 1.2.2.2.4-.1.9-.6 1.2-.4.3-1.1.6-1.3 1.1-.2.5.2 1 .7 1.6.7.8 1.7 1.7 2.7 1.9.4.1.6.4.5.8-.1.6-1.2 1-2.4 1.1-.1.5-.2 1.1-.5 1.3-.6.4-2.1 0-2.9.2-.4.1-.7.4-1.1.7-.6.4-1.3 1-2.4 1s-1.8-.6-2.4-1c-.4-.3-.7-.6-1.1-.7-.8-.2-2.3.2-2.9-.2-.3-.2-.4-.8-.5-1.3-1.2-.1-2.3-.5-2.4-1.1-.1-.4.1-.7.5-.8 1-.2 2-1.1 2.7-1.9.5-.6.9-1.1.7-1.6-.2-.5-.9-.8-1.3-1.1-.5-.3-.8-.8-.6-1.2.2-.5.8-.5 1.2-.2.5.3 1.1.4 1.6.1V8c0-3.6 2.3-6 5.5-6z" />
      </svg>
    ),
  },
  {
    label: "Threads",
    bg: "#101010",
    fg: "#FFFFFF",
    logo: (
      <svg viewBox="0 0 24 24" className={S} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M12 3c5 0 9 3.6 9 8.5S17 21 12 21s-9-4.1-9-9.5S7 3 12 3z" />
        <path d="M15.5 10.5c-.6-1.2-1.9-2-3.5-2-2.2 0-4 1.6-4 3.5s1.8 3.5 4 3.5c1.9 0 3.4-1.2 3.8-2.9.2-1-.3-2.1-1.3-2.1h-2.2" />
      </svg>
    ),
  },
];

function Column({
  offset,
  duration,
  reverse,
}: {
  offset: number;
  duration: number;
  reverse?: boolean;
}) {
  const tiles = [...TILES, ...TILES].map(
    (_t, i) => TILES[(i + offset) % TILES.length] as Tile,
  );
  const doubled = [...tiles, ...tiles];

  return (
    <div className="flex-1 overflow-hidden">
      <div
        className="flex w-full flex-col gap-4"
        style={{
          animation: `cb-drift ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {doubled.map((tile, i) => (
          <div
            key={`${tile.label}-${i}`}
            className="relative aspect-[9/16] w-full shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-lg"
            style={{ background: tile.bg }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: tile.fg }}
            >
              {tile.logo}
            </div>
            <span
              className="absolute left-3 top-3 text-[11px] font-semibold tracking-[0.14em]"
              style={{ color: tile.fg }}
            >
              {tile.label.toUpperCase()}
            </span>
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/35 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlatformBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden"
    >
      <div className="flex h-full w-full -rotate-6 scale-125 gap-4 opacity-[0.55] blur-[2px]">
        <Column offset={0} duration={48} />
        <Column offset={3} duration={64} reverse />
        <Column offset={5} duration={56} />
        <Column offset={2} duration={72} reverse />
        <Column offset={6} duration={60} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/45 to-background/75" />
    </div>
  );
}
