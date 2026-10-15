import { Link } from "@tanstack/react-router";

import { formatNaira } from "@/lib/campaign";
import { BADGE_LABELS, type CourseBadge } from "@/lib/university";

export type PosterCourse = {
  id: string;
  title: string;
  price: number;
  thumbnail_url: string | null;
  outcome_tag: string | null;
  badge: CourseBadge;
  avg_rating: number;
  rating_count: number;
};

function Stars({ value }: { value: number }) {
  const filled = Math.round(Number(value ?? 0));
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-3 w-3 ${i < filled ? "fill-[#4DA3FF]" : "fill-foreground/15"}`}
        >
          <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 14.9 4.6 18l1.2-6L1.3 7.8l6.1-.7L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

export function CoursePoster({
  course,
  owned,
  index = 0,
}: {
  course: PosterCourse;
  owned: boolean;
  index?: number;
}) {
  const badge = course.badge !== "none" ? BADGE_LABELS[course.badge] : null;
  const rated = course.rating_count > 0;

  return (
    <Link
      to="/university/$courseId"
      params={{ courseId: course.id }}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      className="cb-card-in group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#4DA3FF]/40 hover:shadow-[0_18px_40px_-18px_rgba(77,163,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4DA3FF]/60"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={`${course.title} course cover`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="relative h-full w-full bg-[radial-gradient(120%_90%_at_0%_0%,rgba(77,163,255,0.28),transparent_60%),radial-gradient(90%_80%_at_100%_100%,rgba(143,169,189,0.18),transparent_65%)]">
            <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="absolute inset-0 grid place-items-center">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-background/60 ring-1 ring-inset ring-foreground/15 backdrop-blur transition-transform duration-300 group-hover:scale-110">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-foreground">
                  <path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z" />
                </svg>
              </span>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />

        {badge ? (
          <span className="absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#4DA3FF] ring-1 ring-inset ring-[#4DA3FF]/40 backdrop-blur-md">
            {badge}
          </span>
        ) : null}

        {owned ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#4DA3FF] px-2.5 py-1 text-[10px] font-semibold text-black">
            <svg viewBox="0 0 20 20" className="h-3 w-3 fill-current">
              <path d="M7.6 13.6L4.4 10.4l-1.2 1.2 4.4 4.4 9.2-9.2-1.2-1.2z" />
            </svg>
            Unlocked
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold leading-snug tracking-tight">
          {course.title}
        </h3>
        {course.outcome_tag ? (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {course.outcome_tag}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3.5">
          <div className="mt-3.5 flex items-center gap-1.5 text-[11px]">
            <Stars value={course.avg_rating} />
            <span className="text-muted-2">{rated ? course.rating_count : "New"}</span>
          </div>

          <div className="mt-3.5 flex items-center gap-1.5">
            {owned ? (
              <span className="text-[13px] font-semibold text-[#4DA3FF]">Continue</span>
            ) : (
              <span className="text-[14px] font-semibold tabular-nums text-foreground">
                {formatNaira(course.price)}
              </span>
            )}
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 -translate-x-1 fill-[#4DA3FF] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden="true"
            >
              <path d="M11.3 4.3l-1.4 1.4 3.3 3.3H3v2h10.2l-3.3 3.3 1.4 1.4L17 10z" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
