import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * Business area guard. Only business accounts (and admins, for support) may
 * enter; clippers are sent back to their own dashboard. Data itself is still
 * owner-scoped in the database — this is the navigational layer.
 */
export const Route = createFileRoute("/_authenticated/business")({
  beforeLoad: async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("account_type").eq("id", context.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", context.user.id),
    ]);
    const isAdmin = (roles ?? []).some(
      (r) => r.role === "admin" || r.role === "super_admin",
    );
    if (!isAdmin && profile?.account_type !== "business") {
      throw redirect({ to: "/clipper" });
    }
  },
  component: () => <Outlet />,
});
