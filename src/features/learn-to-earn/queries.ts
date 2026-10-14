import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const l2eKeys = {
  enabled: ["learn-to-earn-enabled"] as const,
  isAdmin: (userId: string) => ["is-admin", userId] as const,
};

export function useLearnToEarnEnabled() {
  return useQuery({
    queryKey: l2eKeys.enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("learn_to_earn_enabled");
      if (error) throw error;
      return Boolean(data);
    },
  });
}

export function useIsAdmin(userId: string) {
  return useQuery({
    queryKey: l2eKeys.isAdmin(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as string);
      return roles.includes("admin") || roles.includes("super_admin");
    },
  });
}

export function useSetLearnToEarn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase.rpc("admin_set_learn_to_earn", { _enabled: enabled });
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      toast.success(enabled ? "Learn to earn is now live for everyone" : "Learn to earn is hidden — users see “Coming soon”");
      queryClient.invalidateQueries({ queryKey: l2eKeys.enabled });
      queryClient.invalidateQueries({ queryKey: ["university-courses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
