import { CoursePoster, type PosterCourse } from "@/components/CoursePoster";

export function CourseGrid({
  courses,
  owned,
}: {
  courses: PosterCourse[];
  owned?: Set<string> | undefined;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {courses.map((c, i) => (
        <CoursePoster key={c.id} course={c} owned={owned?.has(c.id) ?? false} index={i} />
      ))}
    </div>
  );
}
