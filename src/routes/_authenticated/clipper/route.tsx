import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { homePathFor } from "@/lib/home";

/**
 * Clipper area guard. Only clipper accounts (and admins, for support) may
 * enter; business and student accounts are sent to their own home.
 */
export const Route = createFileRoute("/_authenticated/clipper")({
  beforeLoad: async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("account_type").eq("id", context.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", context.user.id),
    ]);
    const isAdmin = (roles ?? []).some(
      (r) => r.role === "admin" || r.role === "super_admin",
    );
    const type = profile?.account_type ?? "clipper";
    if (!isAdmin && type !== "clipper") {
      throw redirect({ to: homePathFor(type) });
    }
  },
  component: () => <Outlet />,
});
