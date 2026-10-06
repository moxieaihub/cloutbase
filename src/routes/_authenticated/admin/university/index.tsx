import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";

export const Route = createFileRoute("/_authenticated/admin/university/")({
  head: () => ({
    meta: [
      { title: "University — Cloutbase admin" },
      {
        name: "description",
        content: "Create courses, add lessons and track course sales, revenue and ratings.",
      },
      { property: "og:title", content: "University — Cloutbase admin" },
      { property: "og:description", content: "Course management for Cloutbase University." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUniversity,
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

function AdminUniversity() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("35000");

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, price, badge, is_published, avg_rating, rating_count, sort_order")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sales } = useQuery({
    queryKey: ["admin-course-sales"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_course_sales");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .insert({
          title: title.trim(),
          price: Number(price) || 0,
          sort_order: (courses?.length ?? 0) + 1,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      navigate({ to: "/admin/university/$courseId", params: { courseId: id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = (sales ?? []).reduce(
    (acc, s) => ({
      sales: acc.sales + Number(s.sales_count ?? 0),
      revenue: acc.revenue + Number(s.revenue ?? 0),
    }),
    { sales: 0, revenue: 0 },
  );

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Cloutbase University</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create courses, add lessons and see what each one has earned.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Courses sold</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{totals.sales}</p>
        </div>
        <div className="rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Course revenue</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-money">
            {formatNaira(totals.revenue)}
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-border p-5">
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
            onClick={() => create.mutate()}
            disabled={!title.trim() || create.isPending}
            className="sm:mb-0.5"
          >
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Courses
        </h2>
        <div className="mt-3 space-y-3">
          {(courses ?? []).map((c) => {
            const s = (sales ?? []).find((row) => row.course_id === c.id);
            return (
              <Link
                key={c.id}
                to="/admin/university/$courseId"
                params={{ courseId: c.id }}
                className="block rounded-2xl border border-border p-4 hover:border-foreground/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatNaira(Number(c.price))} · {c.is_published ? "Published" : "Draft"}
                      {c.badge !== "none" ? ` · ${c.badge}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <p>{Number(s?.sales_count ?? 0)} sold</p>
                    <p className="text-money">{formatNaira(Number(s?.revenue ?? 0))}</p>
                    <p className="text-gold">
                      {Number(c.rating_count) > 0
                        ? `${Number(c.avg_rating).toFixed(1)}★ (${c.rating_count})`
                        : "no ratings"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </AdminShell>
  );
}
