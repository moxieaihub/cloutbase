import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { LearnToEarnComingSoon } from "@/features/learn-to-earn/ComingSoon";
import { useIsAdmin, useLearnToEarnEnabled } from "@/features/learn-to-earn/queries";
import { supabase } from "@/integrations/supabase/client";
import { homePathFor, resolveAccountType } from "@/lib/home";

/**
 * Learn to earn is the student area. Only student accounts (and admins, for
 * preview) may enter; clippers and brands are sent to their own home.
 */
export const Route = createFileRoute("/_authenticated/university")({
  beforeLoad: async ({ context }) => {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("account_type").eq("id", context.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", context.user.id),
    ]);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    const type = resolveAccountType(profile?.account_type, context.user) ?? "clipper";
    if (!isAdmin && type !== "student") {
      throw redirect({ to: homePathFor(type) });
    }
  },
  component: LearnToEarnGate,
});

function LearnToEarnGate() {
  const { user } = Route.useRouteContext();
  const { data: enabled, isLoading } = useLearnToEarnEnabled();
  const { data: isAdmin } = useIsAdmin(user.id);

  if (isLoading) return null;
  if (!enabled && !isAdmin) return <LearnToEarnComingSoon />;

  return (
    <>
      {!enabled ? (
        <p className="bg-[#4DA3FF]/15 px-5 py-2 text-center text-xs text-[#4DA3FF]">
          Admin preview — Learn to earn is hidden from users right now.
        </p>
      ) : null}
      <Outlet />
    </>
  );
}
