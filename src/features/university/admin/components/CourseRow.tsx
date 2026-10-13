import { Link } from "@tanstack/react-router";

import { formatNaira } from "@/lib/campaign";

type Course = {
  id: string;
  title: string;
  price: number;
  badge: string;
  is_published: boolean;
  avg_rating: number;
  rating_count: number;
};
type Sale = { sales_count: number; revenue: number } | undefined;

export function CourseRow({ course, sale }: { course: Course; sale: Sale }) {
  return (
    <Link
      to="/admin/university/$courseId"
      params={{ courseId: course.id }}
      className="block rounded-2xl border border-border p-4 hover:border-foreground/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{course.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNaira(Number(course.price))} · {course.is_published ? "Published" : "Draft"}
            {course.badge !== "none" ? ` · ${course.badge}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-muted-foreground">
          <p>{Number(sale?.sales_count ?? 0)} sold</p>
          <p className="text-price">{formatNaira(Number(sale?.revenue ?? 0))}</p>
          <p className="text-[#4DA3FF]">
            {Number(course.rating_count) > 0
              ? `${Number(course.avg_rating).toFixed(1)}★ (${course.rating_count})`
              : "no ratings"}
          </p>
        </div>
      </div>
    </Link>
  );
}
