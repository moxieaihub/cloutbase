DROP POLICY "Signed-in users read lessons of published courses" ON public.course_lessons;
CREATE POLICY "Buyers and admins read lessons" ON public.course_lessons FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.owns_course(auth.uid(), course_id));

CREATE OR REPLACE FUNCTION public.course_lesson_outline(_course_id uuid)
RETURNS TABLE (id uuid, lesson_number integer, title text, duration_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.lesson_number, l.title, l.duration_label
  FROM public.course_lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE l.course_id = _course_id AND (c.is_published OR public.is_admin(auth.uid()))
  ORDER BY l.lesson_number;
$$;
REVOKE EXECUTE ON FUNCTION public.course_lesson_outline(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_lesson_outline(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_course_sales()
RETURNS TABLE (course_id uuid, title text, price numeric, sales_count bigint, revenue numeric, avg_rating numeric, rating_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.price, COUNT(p.id), COALESCE(SUM(p.amount_paid), 0), c.avg_rating, c.rating_count
  FROM public.courses c
  LEFT JOIN public.course_purchases p ON p.course_id = c.id
  WHERE public.is_admin(auth.uid())
  GROUP BY c.id
  ORDER BY c.sort_order, c.created_at;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_course_sales() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_course_sales() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_course_buyers(_course_id uuid)
RETURNS TABLE (user_id uuid, username text, email text, amount_paid numeric, paystack_ref text, purchased_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, pr.username, pr.email, p.amount_paid, p.paystack_ref, p.purchased_at
  FROM public.course_purchases p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.course_id = _course_id AND public.is_admin(auth.uid())
  ORDER BY p.purchased_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_course_buyers(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_course_buyers(uuid) TO authenticated, service_role;