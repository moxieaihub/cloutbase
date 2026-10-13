import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCourse } from "../queries";

export function NewCourseForm({ courseCount }: { courseCount: number }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("35000");

  const create = useCreateCourse((id) => {
    setTitle("");
    navigate({ to: "/admin/university/$courseId", params: { courseId: id } });
  });

  return (
    <section className="rounded-2xl border border-border p-5">
      <h2 className="text-sm font-medium">New course</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div>
          <Label htmlFor="new-course-title">Title</Label>
          <Input
            id="new-course-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course title"
          />
        </div>
        <div>
          <Label htmlFor="new-course-price">Price (₦)</Label>
          <Input
            id="new-course-price"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
        <Button
          onClick={() =>
            create.mutate({
              title: title.trim(),
              price: Number(price) || 0,
              sortOrder: courseCount + 1,
            })
          }
          disabled={!title.trim() || create.isPending}
          className="sm:mb-0.5"
        >
          {create.isPending ? "Creating…" : "Create"}
        </Button>
      </div>
    </section>
  );
}
