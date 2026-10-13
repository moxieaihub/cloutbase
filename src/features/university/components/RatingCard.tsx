import { starRow } from "@/lib/university";
import { useMyRating, useRateCourse } from "../queries";

export function RatingCard({ courseId, userId }: { courseId: string; userId: string }) {
  const { data: myRating } = useMyRating(courseId, userId, true);
  const rate = useRateCourse(courseId, userId);

  return (
    <section className="rounded-2xl border border-border p-4">
      <h2 className="text-sm font-medium">Rate this course</h2>
      {myRating ? (
        <p className="mt-2 text-[13px] text-[#4DA3FF]">
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
              className="h-9 w-9 rounded-lg border border-border text-[#4DA3FF] hover:border-[#4DA3FF]"
            >
              ★
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
