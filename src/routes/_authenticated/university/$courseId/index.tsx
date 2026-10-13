import { useEffect } from "react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { CourseHero } from "@/features/university/components/CourseHero";
import { LessonList } from "@/features/university/components/LessonList";
import { UnlockCard } from "@/features/university/components/UnlockCard";
import { UniversityShell } from "@/features/university/components/UniversityShell";
import { useCourse, useLessonOutline, useOwnsCourse } from "@/features/university/queries";
import { useCourseCheckout } from "@/features/university/useCourseCheckout";

type Search = { ref?: string | undefined };

export const Route = createFileRoute("/_authenticated/university/$courseId/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ref: typeof search["ref"] === "string" ? (search["ref"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Course — Cloutbase University" },
      {
        name: "description",
        content:
          "Course lessons, workbook and what you will be able to do by the end — inside Cloutbase University.",
      },
      { property: "og:title", content: "Course — Cloutbase University" },
      {
        property: "og:description",
        content: "Lessons, workbook and outcomes for this Cloutbase University course.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CourseDetail,
  errorComponent: () => (
    <UniversityShell hideTabs>
      <p className="mt-8 text-sm text-muted-foreground">Something went wrong loading this course.</p>
    </UniversityShell>
  ),
  notFoundComponent: () => (
    <UniversityShell hideTabs>
      <p className="mt-8 text-sm text-muted-foreground">Course not found.</p>
    </UniversityShell>
  ),
});

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { ref } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const { data: course, isLoading } = useCourse(courseId);
  const { data: owns } = useOwnsCourse(courseId, user.id);
  const { data: outline } = useLessonOutline(courseId);
  const checkout = useCourseCheckout(courseId, user.id);
  const confirmReturn = checkout.confirm;

  // Paystack sends the buyer back with ?ref= — confirm it, then clean the URL.
  useEffect(() => {
    if (!ref || owns !== false) return;
    let cancelled = false;
    (async () => {
      try {
        await confirmReturn(ref);
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message);
      } finally {
        if (!cancelled) navigate({ to: ".", params: { courseId }, search: {}, replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref, owns, courseId, confirmReturn, navigate]);

  // Owners belong in the classroom.
  if (owns) {
    return <Navigate to="/university/$courseId/classroom" params={{ courseId }} replace />;
  }

  if (isLoading || owns === undefined) {
    return (
      <UniversityShell hideTabs>
        <p className="mt-10 text-sm text-muted-foreground">Loading course…</p>
      </UniversityShell>
    );
  }
  if (!course) {
    return (
      <UniversityShell hideTabs>
        <p className="mt-10 text-sm text-muted-foreground">This course is not available.</p>
      </UniversityShell>
    );
  }

  return (
    <UniversityShell hideTabs>
      <div className="mt-6 lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-10">
        <div>
          <CourseHero course={course} />

          {course.about ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                About this course
              </h2>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">{course.about}</p>
            </section>
          ) : null}

          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Lessons
            </h2>
            <LessonList items={outline ?? []} locked />
          </section>
        </div>

        <aside className="mt-8 lg:sticky lg:top-6 lg:mt-0">
          <UnlockCard
            price={Number(course.price)}
            outcomeTag={course.outcome_tag}
            paying={checkout.paying}
            onUnlock={checkout.unlock}
          />
        </aside>
      </div>
    </UniversityShell>
  );
}
