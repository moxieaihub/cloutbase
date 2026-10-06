import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * Hidden admin area. There is no public admin signup — only users holding the
 * admin or super_admin role may enter; everyone else is redirected away.
 */
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.user.id);
    if (error) throw redirect({ to: "/dashboard" });

    const roles = (data ?? []).map((r) => r.role as string);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");
    if (!isAdmin) throw redirect({ to: "/dashboard" });

    return { isSuperAdmin: roles.includes("super_admin") };
  },
  component: () => <Outlet />,
});
