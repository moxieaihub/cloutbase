import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { LearnToEarnToggle } from "@/features/admin/components/LearnToEarnToggle";
import { CourseRow } from "@/features/university/admin/components/CourseRow";
import { NewCourseForm } from "@/features/university/admin/components/NewCourseForm";
import { useAdminCourses, useCourseSales } from "@/features/university/admin/queries";
import { formatNaira } from "@/lib/campaign";

export const Route = createFileRoute("/_authenticated/admin/university/")({
  head: () => ({
    meta: [
      { title: "Learn to earn — Cloutbase admin" },
      {
        name: "description",
        content: "Create courses, add lessons and track course sales, revenue and ratings.",
      },
      { property: "og:title", content: "Learn to earn — Cloutbase admin" },
      { property: "og:description", content: "Course management for Learn to earn" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLearnToEarn,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading courses.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

function AdminLearnToEarn() {
  const { data: courses } = useAdminCourses();
  const { data: sales } = useCourseSales();

  const totals = (sales ?? []).reduce(
    (acc, s) => ({
      sales: acc.sales + Number(s.sales_count ?? 0),
      revenue: acc.revenue + Number(s.revenue ?? 0),
    }),
    { sales: 0, revenue: 0 },
  );

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Learn to earn</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create courses, add lessons and see what each one has earned.
      </p>

      <div className="mt-6">
        <LearnToEarnToggle />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Courses sold</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{totals.sales}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Course revenue</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-price">
            {formatNaira(totals.revenue)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <NewCourseForm courseCount={courses?.length ?? 0} />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Courses</h2>
        <div className="mt-3 space-y-3">
          {(courses ?? []).map((c) => (
            <CourseRow
              key={c.id}
              course={c}
              sale={(sales ?? []).find((row) => row.course_id === c.id)}
            />
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
