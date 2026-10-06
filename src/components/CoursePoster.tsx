import { Link } from "@tanstack/react-router";

import { formatNaira } from "@/lib/campaign";
import { BADGE_LABELS, starRow, type CourseBadge } from "@/lib/university";

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

export function CoursePoster({ course, owned }: { course: PosterCourse; owned: boolean }) {
  const badge = course.badge !== "none" ? BADGE_LABELS[course.badge] : null;
  return (
    <Link
      to="/university/$courseId"
      params={{ courseId: course.id }}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-transform hover:-translate-y-0.5 hover:border-foreground/30"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-secondary">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={`${course.title} course cover`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-end bg-[linear-gradient(160deg,rgba(143,169,189,0.22),transparent_65%)] p-3">
            <span className="font-display text-[15px] font-semibold leading-tight">
              {course.title}
            </span>
          </div>
        )}

        {badge ? (
          <span className="absolute left-0 top-3 rounded-r-full bg-gold-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold ring-1 ring-inset ring-gold/40">
            {badge}
          </span>
        ) : null}

        <span
          className={`absolute bottom-2 right-2 rounded-full px-2 py-1 text-[11px] font-semibold ${
            owned
              ? "bg-money-soft text-money ring-1 ring-inset ring-money/40"
              : "bg-background/85 text-price ring-1 ring-inset ring-price/40"
          }`}
        >
          {owned ? "Unlocked ✓" : formatNaira(course.price)}
        </span>
      </div>

      <div className="p-3">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug">{course.title}</p>
        {course.outcome_tag ? (
          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
            {course.outcome_tag}
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] text-gold">
          <span aria-hidden="true">{starRow(course.avg_rating)}</span>{" "}
          <span className="text-muted-2">
            {course.rating_count > 0 ? course.rating_count : "new"}
          </span>
        </p>
      </div>
    </Link>
  );
}
