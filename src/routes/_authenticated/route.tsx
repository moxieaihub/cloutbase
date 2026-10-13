import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    // Remember where the visitor was headed so login can send them back.
    if (error || !data.user) throw redirect({ to: "/login", search: { redirect: location.href } });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
