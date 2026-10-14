import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { homePathFor, resolveAccountType } from "@/lib/home";

/**
 * Business area guard. Only business accounts (and admins, for support) may
 * enter; clippers and students are sent to their own home. Data itself is
 * still owner-scoped in the database — this is the navigational layer.
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
    const type = resolveAccountType(profile?.account_type, context.user) ?? "clipper";
    if (!isAdmin && type !== "business") {
      throw redirect({ to: homePathFor(type) });
    }
  },
  component: () => <Outlet />,
});
