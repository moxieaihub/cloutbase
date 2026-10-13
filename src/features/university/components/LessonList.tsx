type LessonItem = {
  id: string;
  lesson_number: number;
  title: string;
  duration_label: string | null;
};

export function LessonList({
  items,
  locked,
  activeIndex,
  onSelect,
}: {
  items: LessonItem[];
  locked: boolean;
  activeIndex?: number;
  onSelect?: (index: number) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-2 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Lessons are being added.
      </p>
    );
  }

  return (
    <ol className="mt-3 space-y-2">
      {items.map((lesson, index) => {
        const isCurrent = !locked && index === activeIndex;
        return (
          <li key={lesson.id}>
            <button
              type="button"
              disabled={locked}
              onClick={() => onSelect?.(index)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                isCurrent
                  ? "border-[#4DA3FF]/60 bg-card"
                  : "border-border hover:border-foreground/25"
              } ${locked ? "opacity-70" : ""}`}
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-medium">
                  {lesson.lesson_number}. {lesson.title}
                </span>
                {lesson.duration_label ? (
                  <span className="block text-[11px] text-muted-2">{lesson.duration_label}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {locked ? "🔒" : isCurrent ? "Playing" : "Play"}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
