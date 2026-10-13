import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BADGE_LABELS, type CourseBadge } from "@/lib/university";
import { useSaveCourse, type CourseForm } from "../queries";
import { uploadCourseAsset } from "../storage";

type Course = {
  id: string;
  title: string;
  subtitle: string | null;
  about: string | null;
  price: number;
  outcome_tag: string | null;
  badge: string;
  is_published: boolean;
  thumbnail_url: string | null;
  pdf_url: string | null;
};

export function CourseDetailsForm({ course }: { course: Course }) {
  const save = useSaveCourse(course.id);
  const [uploading, setUploading] = useState<"thumb" | "pdf" | null>(null);
  const [form, setForm] = useState<CourseForm>({
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

  async function upload(kind: "thumb" | "pdf", file: File) {
    setUploading(kind);
    try {
      const url = await uploadCourseAsset(course.id, kind, file);
      const next = kind === "thumb" ? { ...form, thumbnail_url: url } : { ...form, pdf_url: url };
      setForm(next);
      await save.mutateAsync(next);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border p-5">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
          {form.pdf_url ? <p className="mt-2 text-xs text-muted-foreground">Workbook uploaded ✓</p> : null}
        </div>
      </div>

      <Button onClick={() => save.mutate(form)} disabled={save.isPending || uploading !== null}>
        {uploading ? "Uploading…" : save.isPending ? "Saving…" : "Save course"}
      </Button>
    </section>
  );
}
