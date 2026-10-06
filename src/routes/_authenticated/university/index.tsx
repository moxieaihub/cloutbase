import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { CoursePoster, type PosterCourse } from "@/components/CoursePoster";
import { supabase } from "@/integrations/supabase/client";

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
  component: University,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Something went wrong loading the courses.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-10">
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

function University() {
  const { user } = Route.useRouteContext();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["university-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, subtitle, price, thumbnail_url, outcome_tag, badge, avg_rating, rating_count, sort_order",
        )
        .eq("is_published", true)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as (PosterCourse & { subtitle: string | null })[];
    },
  });

  const { data: owned } = useQuery({
    queryKey: ["university-owned", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_purchases")
        .select("course_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.course_id));
    },
  });

  const myCourses = (courses ?? []).filter((c) => owned?.has(c.id));
  const rest = (courses ?? []).filter((c) => !owned?.has(c.id));

  return (
    <Shell>
      <div className="mt-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">Cloutbase University</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          Learn how to earn
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Practical courses from people already doing it. Buy once, watch forever — no subscription.
        </p>
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading courses…</p>
      ) : (
        <>
          {myCourses.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Continue learning
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {myCourses.map((c) => (
                  <CoursePoster key={c.id} course={c} owned />
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {myCourses.length > 0 ? "More courses" : "All courses"}
            </h2>
            {rest.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {rest.map((c) => (
                  <CoursePoster key={c.id} course={c} owned={false} />
                ))}
              </div>
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
