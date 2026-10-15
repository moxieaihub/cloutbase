import { createFileRoute } from "@tanstack/react-router";

import { CoursePoster } from "@/components/CoursePoster";
import { UniversityShell } from "@/features/university/components/UniversityShell";
import { useOwnedCourseIds, usePublishedCourses } from "@/features/university/queries";

export const Route = createFileRoute("/_authenticated/university/")({
  head: () => ({
    meta: [
      { title: "Learn to earn — Cloutbase" },
      {
        name: "description",
        content:
          "Short, practical Naira-priced courses on clipping, streaming, content and community — buy once, keep forever.",
      },
      { property: "og:title", content: "Learn to earn — Cloutbase" },
      {
        property: "og:description",
        content: "Practical courses on clipping, streaming and growing an audience in Nigeria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalog,
  errorComponent: () => (
    <Shell>
      <p className="mt-8 text-sm text-muted-foreground">Something went wrong loading the courses.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="mt-8 text-sm text-muted-foreground">Not found.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return <UniversityShell>{children}</UniversityShell>;
}

// Course grid: 2 cols on phones, 3 on tablets, 4 on laptops, 5 on wide desktops.
// function CourseGrid({
//   courses,
//   owned,
// }: {
//   courses: React.ComponentProps<typeof CoursePoster>["course"][];
//   owned?: Set<string>;
// }) {
//   return (
//     <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
//       {courses.map((c) => (
//         <CoursePoster key={c.id} course={c} owned={owned?.has(c.id) ?? false} />
//       ))}
//     </div>
//   );
// }
function CourseGrid({
  courses,
  owned,
}: {
  courses: React.ComponentProps<typeof CoursePoster>["course"][];
  owned?: Set<string>;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {courses.map((c, i) => (
        <CoursePoster key={c.id} course={c} owned={owned?.has(c.id) ?? false} index={i} />
      ))}
    </div>
  );
}

function Catalog() {
  const { user } = Route.useRouteContext();
  const { data: courses, isLoading, error } = usePublishedCourses();
  const { data: owned } = useOwnedCourseIds(user.id);

  const all = courses ?? [];
  const rows = [
    { title: "🔥 Hot right now", items: all.filter((c) => c.badge === "hot") },
    { title: "Most popular", items: all.filter((c) => c.badge === "popular") },
    { title: "Recommended", items: all.filter((c) => c.badge === "recommended") },
  ].filter((r) => r.items.length > 0);

  return (
    <Shell>
      <div className="mt-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">Learn to earn</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
          Learn how to earn
        </h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
          Practical courses from people already doing it. Buy once, watch forever — no
          subscription.
        </p>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading courses…</p>
      ) : error ? (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-5 text-sm text-red-400">
          Couldn't load courses: {(error as Error).message}
        </p>
      ) : (
        <>
          {rows.map((row) => (
            <section key={row.title} className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {row.title}
              </h2>
              <CourseGrid courses={row.items} owned={owned} />
            </section>
          ))}

          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              All courses
            </h2>
            {all.length > 0 ? (
              <CourseGrid courses={all} owned={owned} />
            ) : (
              <p className="mt-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                New courses are on the way.
              </p>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
