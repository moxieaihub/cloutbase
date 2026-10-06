CREATE POLICY "Super admins can add owner admins"
  ON public.owner_admins FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can remove owner admins"
  ON public.owner_admins FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

GRANT INSERT, DELETE ON public.owner_admins TO authenticated;
