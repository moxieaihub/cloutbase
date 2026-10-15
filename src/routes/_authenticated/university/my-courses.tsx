import { createFileRoute, Link } from "@tanstack/react-router";

import { UniversityShell } from "@/features/university/components/UniversityShell";
import { useOwnedCourseIds, usePublishedCourses } from "@/features/university/queries";

export const Route = createFileRoute("/_authenticated/university/my-courses")({
  head: () => ({
    meta: [
      { title: "My courses — Learn to earn" },
      { name: "description", content: "Every course you own, with lifetime access." },
      { property: "og:title", content: "My courses — Learn to earn" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyCourses,
  errorComponent: () => (
    <UniversityShell>
      <p className="mt-8 text-sm text-muted-foreground">Something went wrong loading your courses.</p>
    </UniversityShell>
  ),
  notFoundComponent: () => (
    <UniversityShell>
      <p className="mt-8 text-sm text-muted-foreground">Not found.</p>
    </UniversityShell>
  ),
});

function MyCourses() {
  const { user } = Route.useRouteContext();
  const { data: courses, isLoading: loadingCourses } = usePublishedCourses();
  const { data: owned, isLoading: loadingOwned } = useOwnedCourseIds(user.id);

  const mine = (courses ?? []).filter((c) => owned?.has(c.id));
  const loading = loadingCourses || loadingOwned;

  return (
    <UniversityShell>
      <div className="mt-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">
          My courses
        </h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {mine.length > 0
            ? `You own ${mine.length} course${mine.length === 1 ? "" : "s"} — lifetime access, no subscription.`
            : "Courses you unlock will live here."}
        </p>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : mine.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">You haven’t unlocked a course yet.</p>
          <Link
            to="/university"
            className="mt-3 inline-block text-sm text-[#4DA3FF] underline-offset-4 hover:underline"
          >
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {mine.map((c) => (
            <Link
              key={c.id}
              to="/university/$courseId/classroom"
              params={{ courseId: c.id }}
              className="flex gap-4 rounded-2xl border border-border p-3 transition-colors hover:border-foreground/40"
            >
              <div className="h-28 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {c.thumbnail_url ? (
                  <img
                    src={c.thumbnail_url}
                    alt={`${c.title} cover`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(160deg,rgba(143,169,189,0.25),transparent_70%)]" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                <div>
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{c.title}</p>
                  {c.outcome_tag ? (
                    <p className="mt-1 line-clamp-1 text-[12px] text-muted-foreground">
                      {c.outcome_tag}
                    </p>
                  ) : null}
                </div>
                <span className="text-[13px] font-medium text-[#4DA3FF]">Continue →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </UniversityShell>
  );
}
