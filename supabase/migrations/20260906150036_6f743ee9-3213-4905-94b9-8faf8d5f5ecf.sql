CREATE TYPE public.course_badge AS ENUM ('none','hot','popular','recommended');

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  about text,
  price numeric NOT NULL DEFAULT 0,
  thumbnail_url text,
  pdf_url text,
  outcome_tag text,
  badge public.course_badge NOT NULL DEFAULT 'none',
  is_published boolean NOT NULL DEFAULT false,
  avg_rating numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read published courses" ON public.courses FOR SELECT TO authenticated USING (is_published OR public.is_admin(auth.uid()));
CREATE POLICY "Admins insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update courses" ON public.courses FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete courses" ON public.courses FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER courses_set_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  video_url text,
  duration_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX course_lessons_course_idx ON public.course_lessons(course_id, lesson_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.course_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  amount_paid numeric NOT NULL DEFAULT 0,
  paystack_ref text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT ON public.course_purchases TO authenticated;
GRANT ALL ON public.course_purchases TO service_role;
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own purchases" ON public.course_purchases FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.owns_course(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.course_purchases p WHERE p.user_id = _user_id AND p.course_id = _course_id);
$$;
REVOKE EXECUTE ON FUNCTION public.owns_course(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owns_course(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Signed-in users read lessons of published courses" ON public.course_lessons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.is_published OR public.is_admin(auth.uid()))));
CREATE POLICY "Admins insert lessons" ON public.course_lessons FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update lessons" ON public.course_lessons FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete lessons" ON public.course_lessons FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER course_lessons_set_updated_at BEFORE UPDATE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT ON public.course_ratings TO authenticated;
GRANT ALL ON public.course_ratings TO service_role;
ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read ratings" ON public.course_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers rate once" ON public.course_ratings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.owns_course(auth.uid(), course_id));

CREATE OR REPLACE FUNCTION public.course_ratings_refresh()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.courses c
  SET avg_rating = COALESCE(s.avg_stars, 0), rating_count = COALESCE(s.n, 0)
  FROM (SELECT ROUND(AVG(stars)::numeric, 2) AS avg_stars, COUNT(*) AS n FROM public.course_ratings WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)) s
  WHERE c.id = COALESCE(NEW.course_id, OLD.course_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER course_ratings_refresh_trg AFTER INSERT OR UPDATE OR DELETE ON public.course_ratings
FOR EACH ROW EXECUTE FUNCTION public.course_ratings_refresh();

INSERT INTO public.courses (title, subtitle, about, price, outcome_tag, badge, is_published, sort_order) VALUES
('Become a Profitable Streamer','Turn live streaming into a real income','A complete walkthrough of setting up, growing and monetising a live streaming channel in Nigeria — gear on a budget, choosing your niche, building a loyal chat, and turning viewers into paying supporters.',50000,'Go from zero to paid streams','hot',true,1),
('Grow Your Business on Social Media & Be Profitable','Content that actually sells','How small Nigerian businesses turn social pages into a sales engine — content pillars, posting rhythm, paid ads on a small budget, DMs that close, and tracking what actually makes money.',35000,'Turn followers into customers','popular',true,2),
('Start Earning in 3–4 Months of Creating Content','A realistic first-earnings roadmap','The month-by-month plan for a brand new creator: picking a niche, the first 90 posts, the growth habits that matter, and the earning routes available once you have a small but real audience.',35000,'Your first payout in 90 days','recommended',true,3),
('Make Money from Clipping Big Creators','The clipper playbook','Everything about clipping as a business — finding creators worth clipping, cutting hooks that travel, posting for the algorithm, avoiding strikes, and stacking campaign payouts.',35000,'Get paid per 1,000 views','none',true,4),
('How to Build Any Community','From audience to community','How to build a community people refuse to leave — choosing the platform, the first 100 members, rituals and rules, moderation, and turning a community into a durable income.',35000,'Build a community that pays','none',true,5);