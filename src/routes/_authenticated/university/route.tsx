import { createFileRoute, Outlet } from "@tanstack/react-router";

import { LearnToEarnComingSoon } from "@/features/learn-to-earn/ComingSoon";
import { useIsAdmin, useLearnToEarnEnabled } from "@/features/learn-to-earn/queries";

export const Route = createFileRoute("/_authenticated/university")({
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
