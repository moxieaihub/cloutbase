import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { PosterCourse } from "@/components/CoursePoster";
import { supabase } from "@/integrations/supabase/client";

export type CatalogCourse = PosterCourse & { subtitle: string | null; sort_order: number };

// Keys match the originals so any old invalidations keep working.
export const uniKeys = {
  courses: ["university-courses"] as const,
  owned: (userId: string) => ["university-owned", userId] as const,
  course: (id: string) => ["course", id] as const,
  owns: (id: string, userId: string) => ["course-owned", id, userId] as const,
  outline: (id: string) => ["course-outline", id] as const,
  lessons: (id: string) => ["course-lessons", id] as const,
  rating: (id: string, userId: string) => ["course-rating", id, userId] as const,
};

export function usePublishedCourses() {
  return useQuery({
    queryKey: uniKeys.courses,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, subtitle, price, thumbnail_url, outcome_tag, badge, avg_rating, rating_count, sort_order",
        )
        .eq("is_published", true)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as CatalogCourse[];
    },
  });
}

export function useOwnedCourseIds(userId: string) {
  return useQuery({
    queryKey: uniKeys.owned(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_purchases")
        .select("course_id")
        .eq("user_id", userId);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.course_id));
    },
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: uniKeys.course(courseId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(
          "id, title, subtitle, about, price, thumbnail_url, pdf_url, outcome_tag, badge, avg_rating, rating_count",
        )
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useOwnsCourse(courseId: string, userId: string) {
  return useQuery({
    queryKey: uniKeys.owns(courseId, userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });
}

/** Lesson titles only (no video links) — safe to show on the locked page. */
export function useLessonOutline(courseId: string) {
  return useQuery({
    queryKey: uniKeys.outline(courseId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("course_lesson_outline", {
        _course_id: courseId,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Full lessons with video links. RLS only returns rows to buyers and admins. */
export function useLessons(courseId: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: uniKeys.lessons(courseId),
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

export function useMyRating(courseId: string, userId: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryKey: uniKeys.rating(courseId, userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_ratings")
        .select("stars")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data?.stars ?? null;
    },
  });
}

export function useRateCourse(courseId: string, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stars: number) => {
      const { error } = await supabase
        .from("course_ratings")
        .insert({ course_id: courseId, user_id: userId, stars });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks for rating this course");
      queryClient.invalidateQueries({ queryKey: uniKeys.rating(courseId, userId) });
      queryClient.invalidateQueries({ queryKey: uniKeys.course(courseId) });
      queryClient.invalidateQueries({ queryKey: uniKeys.courses });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
