import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export const unreadKey = ["notifications-unread"] as const;

/** Number of unread notifications for the signed-in user. Refreshes every 30s and on tab focus. */
export function useUnreadNotifications() {
  return useQuery({
    queryKey: unreadKey,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user.id;
      if (!uid) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("read", false);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
