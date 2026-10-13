import { BADGE_LABELS, starRow, starsLabel, type CourseBadge } from "@/lib/university";

type HeroCourse = {
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  badge: string;
  avg_rating: number;
  rating_count: number;
};

export function CourseHero({ course, unlocked = false }: { course: HeroCourse; unlocked?: boolean }) {
  const badgeKey = course.badge as CourseBadge;
  const badge = badgeKey !== "none" ? BADGE_LABELS[badgeKey] : null;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="aspect-[16/9] w-full bg-secondary">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={`${course.title} banner`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(160deg,rgba(143,169,189,0.25),transparent_70%)]" />
          )}
        </div>
        {badge ? (
          <span className="absolute left-0 top-4 rounded-r-full bg-[#4DA3FF]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#4DA3FF] ring-1 ring-inset ring-[#4DA3FF]/40 backdrop-blur">
            {badge}
          </span>
        ) : null}
        {unlocked ? (
          <span className="absolute right-3 top-4 rounded-full bg-[#4DA3FF]/15 px-2.5 py-1 text-[11px] font-semibold text-[#4DA3FF] ring-1 ring-inset ring-[#4DA3FF]/40 backdrop-blur">
            Unlocked ✓
          </span>
        ) : null}
      </div>

      <h1 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-tight lg:text-3xl">
        {course.title}
      </h1>
      {course.subtitle ? (
        <p className="mt-1 text-[13px] text-muted-foreground">{course.subtitle}</p>
      ) : null}
      <p className="mt-2 text-[12px] text-[#4DA3FF]">
        <span aria-hidden="true">{starRow(course.avg_rating)}</span>{" "}
        <span className="text-muted-2">{starsLabel(course.avg_rating, course.rating_count)}</span>
      </p>
    </>
  );
}
