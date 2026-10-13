import { useState } from "react";
import { createFileRoute, Navigate } from "@tanstack/react-router";

import { LessonPlayer } from "@/components/LessonPlayer";
import { Button } from "@/components/ui/button";
import { CourseHero } from "@/features/university/components/CourseHero";
import { LessonList } from "@/features/university/components/LessonList";
import { RatingCard } from "@/features/university/components/RatingCard";
import { UniversityShell } from "@/features/university/components/UniversityShell";
import { useCourse, useLessons, useOwnsCourse } from "@/features/university/queries";

export const Route = createFileRoute("/_authenticated/university/$courseId/classroom")({
  head: () => ({
    meta: [
      { title: "Classroom — Cloutbase University" },
      { name: "description", content: "Watch your lessons and download your workbook." },
      { property: "og:title", content: "Classroom — Cloutbase University" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Classroom,
  errorComponent: () => (
    <UniversityShell hideTabs>
      <p className="mt-8 text-sm text-muted-foreground">Something went wrong loading the classroom.</p>
    </UniversityShell>
  ),
  notFoundComponent: () => (
    <UniversityShell hideTabs>
      <p className="mt-8 text-sm text-muted-foreground">Course not found.</p>
    </UniversityShell>
  ),
});

function Classroom() {
  const { courseId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const [active, setActive] = useState(0);

  const { data: course, isLoading } = useCourse(courseId);
  const { data: owns } = useOwnsCourse(courseId, user.id);
  const { data: lessons } = useLessons(courseId, owns === true);

  // Not a buyer → back to the locked page.
  if (owns === false) {
    return <Navigate to="/university/$courseId" params={{ courseId }} replace />;
  }

  if (isLoading || owns === undefined) {
    return (
      <UniversityShell hideTabs>
        <p className="mt-10 text-sm text-muted-foreground">Loading classroom…</p>
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

  const list = lessons ?? [];
  const current = list[active];
  const hasPrev = active > 0;
  const hasNext = active < list.length - 1;

  return (
    <UniversityShell hideTabs>
      <div className="mt-6 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-10">
        <div>
          {current ? (
            <section>
              <LessonPlayer
                key={current.id}
                videoUrl={current.video_url}
                title={current.title}
                watermark={user.email ?? "Cloutbase"}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-w-0 text-[13px] text-muted-foreground">
                  Lesson {current.lesson_number} · {current.title}
                  {current.duration_label ? ` · ${current.duration_label}` : ""}
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrev}
                    onClick={() => setActive((i) => i - 1)}
                  >
                    Previous
                  </Button>
                  <Button size="sm" disabled={!hasNext} onClick={() => setActive((i) => i + 1)}>
                    Next lesson
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Lessons are being added.
            </p>
          )}

          <div className="mt-8">
            <CourseHero course={course} unlocked />
          </div>

          {course.about ? (
            <section className="mt-6">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                About this course
              </h2>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">{course.about}</p>
            </section>
          ) : null}
        </div>

        <aside className="mt-8 space-y-6 lg:mt-0">
          <section>
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Lessons
            </h2>
            <LessonList items={list} locked={false} activeIndex={active} onSelect={setActive} />
          </section>

          {course.pdf_url ? (
            <a
              href={course.pdf_url}
              target="_blank"
              rel="noreferrer"
              download
              className="flex items-center justify-between rounded-2xl border border-border p-4 text-sm hover:border-foreground"
            >
              <span>Download the workbook (PDF)</span>
              <span className="text-xs text-muted-foreground">↓</span>
            </a>
          ) : null}

          <RatingCard courseId={courseId} userId={user.id} />
        </aside>
      </div>
    </UniversityShell>
  );
}
