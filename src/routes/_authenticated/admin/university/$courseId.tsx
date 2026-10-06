import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { BADGE_LABELS, type CourseBadge } from "@/lib/university";

const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5; // 5 years

export const Route = createFileRoute("/_authenticated/admin/university/$courseId")({
  head: () => ({
    meta: [
      { title: "Edit course — Cloutbase admin" },
      {
        name: "description",
        content: "Edit course details, upload the cover and workbook, and manage lessons.",
      },
      { property: "og:title", content: "Edit course — Cloutbase admin" },
      { property: "og:description", content: "Course editor for Cloutbase University." },
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

type Form = {
  title: string;
  subtitle: string;
  about: string;
  price: string;
  outcome_tag: string;
  badge: CourseBadge;
  is_published: boolean;
  thumbnail_url: string | null;
  pdf_url: string | null;
};

function EditCourse() {
  const { courseId } = Route.useParams();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [uploading, setUploading] = useState<"thumb" | "pdf" | null>(null);

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonUrl, setLessonUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");

  const { data: course } = useQuery({
    queryKey: ["admin-course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, subtitle, about, price, outcome_tag, badge, is_published, thumbnail_url, pdf_url, avg_rating, rating_count",
        )
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (course && !form) {
      setForm({
        title: course.title ?? "",
        subtitle: course.subtitle ?? "",
        about: course.about ?? "",
        price: String(course.price ?? 0),
        outcome_tag: course.outcome_tag ?? "",
        badge: (course.badge ?? "none") as CourseBadge,
        is_published: Boolean(course.is_published),
        thumbnail_url: course.thumbnail_url,
        pdf_url: course.pdf_url,
      });
    }
  }, [course, form]);

  const { data: lessons } = useQuery({
    queryKey: ["admin-course-lessons", courseId],
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

  const { data: buyers } = useQuery({
    queryKey: ["admin-course-buyers", courseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_course_buyers", { _course_id: courseId });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<Form>) => {
      const next = { ...(form as Form), ...patch };
      const { error } = await supabase
        .from("courses")
        .update({
          title: next.title.trim(),
          subtitle: next.subtitle.trim() || null,
          about: next.about.trim() || null,
          price: Number(next.price) || 0,
          outcome_tag: next.outcome_tag.trim() || null,
          badge: next.badge,
          is_published: next.is_published,
          thumbnail_url: next.thumbnail_url,
          pdf_url: next.pdf_url,
        })
        .eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course saved");
      queryClient.invalidateQueries({ queryKey: ["admin-course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      queryClient.invalidateQueries({ queryKey: ["university-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addLesson = useMutation({
    mutationFn: async () => {
      const nextNumber = (lessons?.length ?? 0) + 1;
      const { error } = await supabase.from("course_lessons").insert({
        course_id: courseId,
        lesson_number: nextNumber,
        title: lessonTitle.trim(),
        video_url: lessonUrl.trim() || null,
        duration_label: lessonDuration.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLessonTitle("");
      setLessonUrl("");
      setLessonDuration("");
      queryClient.invalidateQueries({ queryKey: ["admin-course-lessons", courseId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-course-lessons", courseId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function upload(kind: "thumb" | "pdf", file: File) {
    setUploading(kind);
    try {
      const folder = kind === "thumb" ? "thumbnails" : `workbooks/${courseId}`;
      const path = `${folder}/${courseId}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("course-assets")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data, error: signError } = await supabase.storage
        .from("course-assets")
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signError) throw signError;
      await save.mutateAsync(
        kind === "thumb" ? { thumbnail_url: data.signedUrl } : { pdf_url: data.signedUrl },
      );
      setForm((f) =>
        f ? { ...f, [kind === "thumb" ? "thumbnail_url" : "pdf_url"]: data.signedUrl } : f,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  if (!form) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Loading course…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{form.title || "Untitled course"}</h1>
        <Link
          to="/admin/university"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          All courses
        </Link>
      </div>

      <section className="mt-6 space-y-4 rounded-2xl border border-border p-5">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input
            id="subtitle"
            value={form.subtitle}
            onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="about">About</Label>
          <Textarea
            id="about"
            rows={5}
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="price">Price (₦)</Label>
            <Input
              id="price"
              inputMode="numeric"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </div>
          <div>
            <Label htmlFor="outcome">Outcome tag</Label>
            <Input
              id="outcome"
              value={form.outcome_tag}
              onChange={(e) => setForm({ ...form, outcome_tag: e.target.value })}
              placeholder="Earn your first ₦100,000 clipping"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="badge">Badge</Label>
            <select
              id="badge"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value as CourseBadge })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="none">No badge</option>
              <option value="hot">{BADGE_LABELS.hot}</option>
              <option value="popular">{BADGE_LABELS.popular}</option>
              <option value="recommended">{BADGE_LABELS.recommended}</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              Published
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="thumb">Cover image</Label>
            <Input
              id="thumb"
              type="file"
              accept="image/*"
              disabled={uploading !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload("thumb", file);
              }}
            />
            {form.thumbnail_url ? (
              <img
                src={form.thumbnail_url}
                alt="Course cover preview"
                className="mt-2 h-24 w-auto rounded-lg border border-border object-cover"
              />
            ) : null}
          </div>
          <div>
            <Label htmlFor="pdf">Workbook (PDF)</Label>
            <Input
              id="pdf"
              type="file"
              accept="application/pdf"
              disabled={uploading !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload("pdf", file);
              }}
            />
            {form.pdf_url ? (
              <p className="mt-2 text-xs text-muted-foreground">Workbook uploaded ✓</p>
            ) : null}
          </div>
        </div>

        <Button onClick={() => save.mutate({})} disabled={save.isPending || uploading !== null}>
          {uploading ? "Uploading…" : save.isPending ? "Saving…" : "Save course"}
        </Button>
      </section>

      <section className="mt-8 rounded-2xl border border-border p-5">
        <h2 className="text-sm font-medium">Lessons</h2>
        <ol className="mt-3 space-y-2">
          {(lessons ?? []).map((l) => (
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
                onClick={() => removeLesson.mutate(l.id)}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Remove
              </button>
            </li>
          ))}
          {(lessons ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No lessons yet.</li>
          ) : null}
        </ol>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end">
          <div>
            <Label htmlFor="lesson-title">Lesson title</Label>
            <Input
              id="lesson-title"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="lesson-url">Google Drive link</Label>
            <Input
              id="lesson-url"
              value={lessonUrl}
              onChange={(e) => setLessonUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/…"
            />
          </div>
          <div>
            <Label htmlFor="lesson-duration">Duration</Label>
            <Input
              id="lesson-duration"
              value={lessonDuration}
              onChange={(e) => setLessonDuration(e.target.value)}
              placeholder="12 min"
            />
          </div>
          <Button
            onClick={() => addLesson.mutate()}
            disabled={!lessonTitle.trim() || addLesson.isPending}
            className="sm:mb-0.5"
          >
            Add
          </Button>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border p-5">
        <h2 className="text-sm font-medium">Buyers</h2>
        <div className="mt-3 space-y-2">
          {(buyers ?? []).map((b, i) => (
            <div
              key={`${b.user_id}-${i}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate">@{b.username ?? "user"}</span>
              <span className="shrink-0 text-money">{formatNaira(Number(b.amount_paid ?? 0))}</span>
            </div>
          ))}
          {(buyers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
