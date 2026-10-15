import { createFileRoute, Link } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { BuyersList } from "@/features/university/admin/components/BuyersList";
import { CourseDetailsForm } from "@/features/university/admin/components/CourseDetailsForm";
import { LessonManager } from "@/features/university/admin/components/LessonManager";
import { useAdminCourse, useCourseSales } from "@/features/university/admin/queries";
import { formatNaira } from "@/lib/campaign";

export const Route = createFileRoute("/_authenticated/admin/university/$courseId")({
  head: () => ({
    meta: [
      { title: "Edit course — Cloutbase admin" },
      {
        name: "description",
        content: "Edit course details, upload the cover and workbook, and manage lessons.",
      },
      { property: "og:title", content: "Edit course — Cloutbase admin" },
      { property: "og:description", content: "Course editor for Learn to earn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditCourse,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading this course.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Course not found.</p>
    </AdminShell>
  ),
});

function EditCourse() {
  const { courseId } = Route.useParams();
  const { data: course, isLoading } = useAdminCourse(courseId);
  const { data: sales } = useCourseSales();
  const sale = (sales ?? []).find((s) => s.course_id === courseId);

  if (isLoading) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Loading course…</p>
      </AdminShell>
    );
  }
  if (!course) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Course not found.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{course.title || "Untitled course"}</h1>
        <Link
          to="/admin/university"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          All courses
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Sold</p>
          <p className="mt-1 text-xl font-semibold">{Number(sale?.sales_count ?? 0)}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="mt-1 text-xl font-semibold text-price">
            {formatNaira(Number(sale?.revenue ?? 0))}
          </p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Rating</p>
          <p className="mt-1 text-xl font-semibold text-[#4DA3FF]">
            {Number(course.rating_count) > 0 ? `${Number(course.avg_rating).toFixed(1)}★` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        {/* key resets the form state if you navigate between courses */}
        <CourseDetailsForm key={course.id} course={course} />
        <div className="space-y-6">
          <LessonManager courseId={courseId} />
          <BuyersList courseId={courseId} courseTitle={course.title} />
        </div>
      </div>
    </AdminShell>
  );
}
