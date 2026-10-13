import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { CourseBadge } from "@/lib/university";

export type CourseForm = {
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

export const adminKeys = {
  courses: ["admin-courses"] as const,
  sales: ["admin-course-sales"] as const,
  course: (id: string) => ["admin-course", id] as const,
  lessons: (id: string) => ["admin-course-lessons", id] as const,
  buyers: (id: string) => ["admin-course-buyers", id] as const,
};

export function useAdminCourses() {
  return useQuery({
    queryKey: adminKeys.courses,
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
}

export function useCourseSales() {
  return useQuery({
    queryKey: adminKeys.sales,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_course_sales");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCourse(onCreated: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; price: number; sortOrder: number }) => {
      const { data, error } = await supabase
        .from("courses")
        .insert({ title: input.title, price: input.price, sort_order: input.sortOrder })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.courses });
      onCreated(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAdminCourse(courseId: string) {
  return useQuery({
    queryKey: adminKeys.course(courseId),
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
}

export function useSaveCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: CourseForm) => {
      const { error } = await supabase
        .from("courses")
        .update({
          title: form.title.trim(),
          subtitle: form.subtitle.trim() || null,
          about: form.about.trim() || null,
          price: Number(form.price) || 0,
          outcome_tag: form.outcome_tag.trim() || null,
          badge: form.badge,
          is_published: form.is_published,
          thumbnail_url: form.thumbnail_url,
          pdf_url: form.pdf_url,
        })
        .eq("id", courseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course saved");
      queryClient.invalidateQueries({ queryKey: adminKeys.course(courseId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.courses });
      queryClient.invalidateQueries({ queryKey: ["university-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAdminLessons(courseId: string) {
  return useQuery({
    queryKey: adminKeys.lessons(courseId),
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
}

export type LessonRow = {
  id: string;
  lesson_number: number;
  title: string;
  video_url: string | null;
  duration_label: string | null;
};

export function useAddLesson(courseId: string, onAdded: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      videoUrl: string;
      duration: string;
      lessons: LessonRow[];
    }) => {
      // max + 1, not length + 1 — length reuses numbers after a delete.
      const nextNumber = input.lessons.reduce((m, l) => Math.max(m, l.lesson_number), 0) + 1;
      const { error } = await supabase.from("course_lessons").insert({
        course_id: courseId,
        lesson_number: nextNumber,
        title: input.title.trim(),
        video_url: input.videoUrl.trim() || null,
        duration_label: input.duration.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.lessons(courseId) });
      onAdded();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; lessons: LessonRow[] }) => {
      const { error } = await supabase.from("course_lessons").delete().eq("id", input.id);
      if (error) throw error;

      // Close the gap so lessons stay 1, 2, 3… and play in order.
      const remaining = input.lessons
        .filter((l) => l.id !== input.id)
        .sort((a, b) => a.lesson_number - b.lesson_number);
      for (const [index, lesson] of remaining.entries()) {
        if (lesson.lesson_number !== index + 1) {
          const { error: renumberError } = await supabase
            .from("course_lessons")
            .update({ lesson_number: index + 1 })
            .eq("id", lesson.id);
          if (renumberError) throw renumberError;
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: adminKeys.lessons(courseId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCourseBuyers(courseId: string) {
  return useQuery({
    queryKey: adminKeys.buyers(courseId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_course_buyers", { _course_id: courseId });
      if (error) throw error;
      return data ?? [];
    },
  });
}
