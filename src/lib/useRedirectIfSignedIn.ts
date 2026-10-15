import { useEffect, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

/**
 * Signed-in visitors should never see the login or signup forms — they go straight
 * to their own dashboard (or to the `redirect` they came with).
 * Returns "checking" while we look, then "signed-out" once it's safe to show the form.
 */
export function useRedirectIfSignedIn(redirectTo?: string): "checking" | "signed-out" {
  const navigate = useNavigate();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "signed-out">("checking");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!active) return;
      if (!sessionData.session) {
        setStatus("signed-out");
        return;
      }

      // A saved session can be stale — confirm with the server before leaving this page.
      const { data: userData, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !userData.user) {
        setStatus("signed-out");
        return;
      }

      if (redirectTo) router.history.replace(redirectTo);
      else navigate({ to: "/dashboard", replace: true });
    })();
    return () => {
      active = false;
    };
    // Only check once, when the page opens — never after a fresh login or signup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return status;
}
