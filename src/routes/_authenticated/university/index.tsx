// import { createFileRoute, Link } from "@tanstack/react-router";

// import { Logo } from "@/components/Logo";
import { createFileRoute } from "@tanstack/react-router";

import { CoursePoster } from "@/components/CoursePoster";
import { UniversityShell } from "@/features/university/components/UniversityShell";
import { useOwnedCourseIds, usePublishedCourses } from "@/features/university/queries";
import { CoursePoster } from "@/components/CoursePoster";
import { useOwnedCourseIds, usePublishedCourses } from "@/features/university/queries";

export const Route = createFileRoute("/_authenticated/university/")({
  head: () => ({
    meta: [
      { title: "Cloutbase University — learn how to earn" },
      {
        name: "description",
        content:
          "Short, practical Naira-priced courses on clipping, streaming, content and community — buy once, keep forever.",
      },
      { property: "og:title", content: "Cloutbase University — learn how to earn" },
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

// Page container: phone-width on mobile, widens progressively on larger screens.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-10 sm:max-w-2xl sm:px-8 lg:max-w-5xl lg:px-10 xl:max-w-6xl">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </Link>
      </header>
      {children}
    </main>
  );
}

// Course grid: 2 cols on phones, 3 on tablets, 4 on laptops, 5 on wide desktops.
function CourseGrid({
  courses,
  owned,
}: {
  courses: React.ComponentProps<typeof CoursePoster>["course"][];
  owned?: Set<string>;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
      {courses.map((c) => (
        <CoursePoster key={c.id} course={c} owned={owned?.has(c.id) ?? false} />
      ))}
    </div>
  );
}

function Catalog() {
  const { user } = Route.useRouteContext();
  const { data: courses, isLoading } = usePublishedCourses();
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
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">Cloutbase University</p>
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
