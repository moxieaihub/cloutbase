import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddLesson, useAdminLessons, useRemoveLesson } from "../queries";

export function LessonManager({ courseId }: { courseId: string }) {
  const { data: lessons } = useAdminLessons(courseId);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState("");

  const add = useAddLesson(courseId, () => {
    setTitle("");
    setUrl("");
    setDuration("");
  });
  const remove = useRemoveLesson(courseId);
  const list = lessons ?? [];

  return (
    <section className="rounded-2xl border border-border p-5">
      <h2 className="text-sm font-medium">Lessons</h2>

      <ol className="mt-3 space-y-2">
        {list.map((l) => (
          <li
            key={l.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
          >
            <div className="min-w-0">
              <p className="text-sm">
                {l.lesson_number}. {l.title}
              </p>
              <p className="truncate text-[11px] text-muted-2">
                {l.video_url ?? "No video link"} {l.duration_label ? `· ${l.duration_label}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate({ id: l.id, lessons: list })}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          </li>
        ))}
        {list.length === 0 ? <li className="text-sm text-muted-foreground">No lessons yet.</li> : null}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
        <div>
          <Label htmlFor="lesson-title">Lesson title</Label>
          <Input id="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lesson-url">Google Drive link</Label>
          <Input
            id="lesson-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/file/d/…"
          />
        </div>
        <div>
          <Label htmlFor="lesson-duration">Duration</Label>
          <Input
            id="lesson-duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="12 min"
          />
        </div>
        <Button
          onClick={() => add.mutate({ title, videoUrl: url, duration, lessons: list })}
          disabled={!title.trim() || add.isPending}
          className="sm:mb-0.5"
        >
          Add
        </Button>
      </div>
    </section>
  );
}
