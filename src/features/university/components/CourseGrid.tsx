import { CoursePoster, type PosterCourse } from "@/components/CoursePoster";

export function CourseGrid({
  courses,
  owned,
}: {
  courses: PosterCourse[];
  owned?: Set<string> | undefined;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {courses.map((c) => (
        <CoursePoster key={c.id} course={c} owned={owned?.has(c.id) ?? false} />
      ))}
    </div>
  );
}
