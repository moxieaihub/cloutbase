import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CoursePoster } from "@/components/CoursePoster";
import { UniversityShell } from "@/features/university/components/UniversityShell";
import { useOwnedCourseIds, usePublishedCourses } from "@/features/university/queries";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/university/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Learn to earn" },
      { name: "description", content: "Your courses and what to learn next on Learn to earn." },
      { property: "og:title", content: "Dashboard — Learn to earn" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UniversityDashboard,
  errorComponent: () => (
    <UniversityShell>
      <p className="mt-8 text-sm text-muted-foreground">Something went wrong loading your dashboard.</p>
    </UniversityShell>
  ),
  notFoundComponent: () => (
    <UniversityShell>
      <p className="mt-8 text-sm text-muted-foreground">Not found.</p>
    </UniversityShell>
  ),
});

function UniversityDashboard() {
  const { user } = Route.useRouteContext();
  const { data: courses, isLoading: loadingCourses } = usePublishedCourses();
  const { data: owned, isLoading: loadingOwned } = useOwnedCourseIds(user.id);

  const { data: username } = useQuery({
    queryKey: ["university-username", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.username ?? null;
    },
  });

  const all = courses ?? [];
  const mine = all.filter((c) => owned?.has(c.id));
  const discover = all.filter((c) => !owned?.has(c.id)).slice(0, 4);
  const loading = loadingCourses || loadingOwned;

  return (
    <UniversityShell>
      <div className="mt-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">Learn to earn</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight lg:text-3xl">
          Welcome back{username ? `, @${username}` : ""}
        </h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Pick up where you left off or find your next course.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-[12px] text-muted-foreground">Courses owned</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{loading ? "…" : mine.length}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-[12px] text-muted-foreground">Available to unlock</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {loading ? "…" : all.length - mine.length}
          </p>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Continue learning
          </h2>
          {mine.length > 0 ? (
            <Link
              to="/university/my-courses"
              className="text-[13px] text-[#4DA3FF] underline-offset-4 hover:underline"
            >
              See all
            </Link>
          ) : null}
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : mine.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">You haven’t unlocked a course yet.</p>
            <Link
              to="/university"
              className="mt-3 inline-block text-sm text-[#4DA3FF] underline-offset-4 hover:underline"
            >
              Browse the catalog
            </Link>
          </div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {mine.slice(0, 4).map((c) => (
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
      </section>

      {!loading && discover.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Discover
            </h2>
            <Link
              to="/university"
              className="text-[13px] text-[#4DA3FF] underline-offset-4 hover:underline"
            >
              Full catalog
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {discover.map((c) => (
              <CoursePoster key={c.id} course={c} owned={false} />
            ))}
          </div>
        </section>
      ) : null}
    </UniversityShell>
  );
}
