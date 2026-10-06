import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { LessonPlayer } from "@/components/LessonPlayer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { confirmCoursePurchase, initCoursePayment } from "@/lib/courses.functions";
import { BADGE_LABELS, starRow, starsLabel, type CourseBadge } from "@/lib/university";

type Search = { ref?: string | undefined };

export const Route = createFileRoute("/_authenticated/university/$courseId")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ref: typeof search['ref'] === "string" ? (search['ref'] as string) : undefined,
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
    <Shell>
      <p className="text-sm text-muted-foreground">Something went wrong loading this course.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Course not found.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-28 pt-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/university" className="text-sm text-muted-foreground hover:text-foreground">
          All courses
        </Link>
      </header>
      {children}
    </main>
  );
}

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { ref } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initPayment = useServerFn(initCoursePayment);
  const confirmPurchase = useServerFn(confirmCoursePurchase);

  const [activeLesson, setActiveLesson] = useState(0);
  const [paying, setPaying] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, subtitle, about, price, thumbnail_url, pdf_url, outcome_tag, badge, avg_rating, rating_count",
        )
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: owned } = useQuery({
    queryKey: ["course-owned", courseId, user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  const { data: outline } = useQuery({
    queryKey: ["course-outline", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("course_lesson_outline", {
        _course_id: courseId,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lessons } = useQuery({
    enabled: owned === true,
    queryKey: ["course-lessons", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("id, lesson_number, title, video_url, duration_label")
        .eq("course_id", courseId)
        .order("lesson_number");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myRating } = useQuery({
    enabled: owned === true,
    queryKey: ["course-rating", courseId, user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_ratings")
        .select("stars")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.stars ?? null;
    },
  });

  const rate = useMutation({
    mutationFn: async (stars: number) => {
      const { error } = await supabase
        .from("course_ratings")
        .insert({ course_id: courseId, user_id: user.id, stars });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for rating this course");
      queryClient.invalidateQueries({ queryKey: ["course-rating", courseId, user.id] });
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["university-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Paystack sends the buyer back with ?ref= — confirm it, then clean the URL.
  useEffect(() => {
    if (!ref || owned) return;
    let cancelled = false;
    (async () => {
      try {
        await confirmPurchase({ data: { courseId, reference: ref } });
        if (cancelled) return;
        toast.success("Course unlocked — enjoy!");
        queryClient.invalidateQueries({ queryKey: ["course-owned", courseId, user.id] });
        queryClient.invalidateQueries({ queryKey: ["university-owned", user.id] });
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message);
      } finally {
        if (!cancelled) navigate({ to: ".", params: { courseId }, search: {}, replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref, owned, courseId, confirmPurchase, navigate, queryClient, user.id]);

  async function unlock() {
    if (owned) return;
    setPaying(true);
    try {
      const callbackUrl = `${window.location.origin}/university/${courseId}`;
      const started = await initPayment({ data: { courseId, callbackUrl } });
      if (started.mode === "owned") {
        queryClient.invalidateQueries({ queryKey: ["course-owned", courseId, user.id] });
        return;
      }
      if (started.mode === "paystack" && started.authorizationUrl) {
        window.location.href = started.authorizationUrl;
        return;
      }
      await confirmPurchase({ data: { courseId, reference: started.reference! } });
      toast.success("Course unlocked — enjoy!");
      queryClient.invalidateQueries({ queryKey: ["course-owned", courseId, user.id] });
      queryClient.invalidateQueries({ queryKey: ["university-owned", user.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaying(false);
    }
  }

  if (isLoading) {
    return (
      <Shell>
        <p className="mt-10 text-sm text-muted-foreground">Loading course…</p>
      </Shell>
    );
  }
  if (!course) {
    return (
      <Shell>
        <p className="mt-10 text-sm text-muted-foreground">This course is not available.</p>
      </Shell>
    );
  }

  const badge = (course.badge as CourseBadge) !== "none" ? BADGE_LABELS[course.badge as Exclude<CourseBadge, "none">] : null;
  const list = owned ? (lessons ?? []) : (outline ?? []);
  const current = owned ? lessons?.[activeLesson] : undefined;

  return (
    <Shell>
      <div className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="aspect-[16/10] w-full bg-secondary">
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
          <span className="absolute left-0 top-4 rounded-r-full bg-gold-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold ring-1 ring-inset ring-gold/40">
            {badge}
          </span>
        ) : null}
        {owned ? (
          <span className="absolute right-3 top-4 rounded-full bg-money-soft px-2.5 py-1 text-[11px] font-semibold text-money ring-1 ring-inset ring-money/40">
            Unlocked ✓
          </span>
        ) : null}
      </div>

      <h1 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-tight">
        {course.title}
      </h1>
      {course.subtitle ? (
        <p className="mt-1 text-[13px] text-muted-foreground">{course.subtitle}</p>
      ) : null}
      <p className="mt-2 text-[12px] text-gold">
        <span aria-hidden="true">{starRow(course.avg_rating)}</span>{" "}
        <span className="text-muted-2">{starsLabel(course.avg_rating, course.rating_count)}</span>
      </p>

      {owned && current ? (
        <section className="mt-6">
          <LessonPlayer
            videoUrl={current.video_url}
            title={current.title}
            watermark={user.email ?? "Cloutbase"}
          />
          <p className="mt-2 text-[12px] text-muted-foreground">
            Lesson {current.lesson_number} · {current.title}
            {current.duration_label ? ` · ${current.duration_label}` : ""}
          </p>
        </section>
      ) : null}

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
        {list.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Lessons are being added.
          </p>
        ) : (
          <ol className="mt-3 space-y-2">
            {list.map((lesson, index) => {
              const isCurrent = owned && index === activeLesson;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    disabled={!owned}
                    onClick={() => setActiveLesson(index)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      isCurrent
                        ? "border-foreground/40 bg-card"
                        : "border-border hover:border-foreground/25"
                    } ${owned ? "" : "opacity-70"}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium">
                        {lesson.lesson_number}. {lesson.title}
                      </span>
                      {lesson.duration_label ? (
                        <span className="block text-[11px] text-muted-2">
                          {lesson.duration_label}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted-foreground">
                      {owned ? (isCurrent ? "Playing" : "Play") : "🔒"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {owned ? (
        <>
          {course.pdf_url ? (
            <a
              href={course.pdf_url}
              target="_blank"
              rel="noreferrer"
              download
              className="mt-6 flex items-center justify-between rounded-2xl border border-border p-4 text-sm hover:border-foreground"
            >
              <span>Download the workbook (PDF)</span>
              <span className="text-xs text-muted-foreground">↓</span>
            </a>
          ) : null}

          <section className="mt-6 rounded-2xl border border-border p-4">
            <h2 className="text-sm font-medium">Rate this course</h2>
            {myRating ? (
              <p className="mt-2 text-[13px] text-gold">
                <span aria-hidden="true">{starRow(myRating)}</span>{" "}
                <span className="text-muted-foreground">You rated this course {myRating}/5</span>
              </p>
            ) : (
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={rate.isPending}
                    onClick={() => rate.mutate(s)}
                    aria-label={`Rate ${s} out of 5`}
                    className="h-9 w-9 rounded-lg border border-border text-gold hover:border-gold"
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="mt-8 rounded-2xl border border-border p-5">
          <p className="text-[13px] text-muted-foreground">{course.outcome_tag ?? "Lifetime access"}</p>
          <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-price">
            {formatNaira(course.price)}
          </p>
          <p className="mt-1 text-[12px] text-muted-2">
            One payment. Yours forever — no subscription.
          </p>
          <Button onClick={unlock} disabled={paying} className="mt-4 w-full">
            {paying ? "Opening checkout…" : "Unlock this course"}
          </Button>
        </section>
      )}
    </Shell>
  );
}
