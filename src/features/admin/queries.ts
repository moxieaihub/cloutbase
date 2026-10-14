import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { sendCampaignEmail } from "@/lib/email.functions";

type Fn = Database["public"]["Functions"];
export type ReviewRow = Fn["admin_review_queue"]["Returns"][number];
export type CampaignRow = Fn["admin_campaign_analytics"]["Returns"][number];
export type RosterRow = Fn["admin_campaign_clippers"]["Returns"][number];
export type ClipperApplicant = Fn["admin_clipper_applications"]["Returns"][number];

export type LinkedAccount = { platform: string; handle: string; followers: number; avg_views: number };
export type SlotApplication = {
  application_id: string;
  campaign_id: string;
  campaign_title: string;
  campaign_slots: number;
  slots_taken: number;
  clipper_user_id: string;
  username: string | null;
  email: string | null;
  real_name: string | null;
  whatsapp: string | null;
  avg_views: number;
  followers_count: number;
  lifetime_views: number;
  strikes: number;
  banned: boolean;
  status: "applied" | "accepted" | "declined";
  decline_reason: string | null;
  applied_at: string;
  accounts: LinkedAccount[];
};
export type FlagRow = {
  kind: string; campaign_id: string; campaign_title: string;
  clipper_user_id: string; username: string; detail: string; at: string;
};

// Same keys the existing admin pages already use, so invalidations stay shared.
export const adminKeys = {
  reviewQueue: ["admin-review-queue"] as const,
  flags: ["admin-flags"] as const,
  campaigns: ["admin-campaign-analytics"] as const,
  roster: (id: string) => ["admin-campaign-roster", id] as const,
  applications: (id?: string) => ["admin-slot-applications", id ?? "all"] as const,
  clippers: ["admin-clipper-applications"] as const,
};

export function useReviewQueue() {
  return useQuery({
    queryKey: adminKeys.reviewQueue,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_review_queue");
      if (error) throw error;
      return (data ?? []) as ReviewRow[];
    },
  });
}

export function useFlags() {
  return useQuery({
    queryKey: adminKeys.flags,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_flags");
      if (error) throw error;
      return (data ?? []) as FlagRow[];
    },
  });
}

export function useCampaignAnalytics() {
  return useQuery({
    queryKey: adminKeys.campaigns,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_campaign_analytics");
      if (error) throw error;
      return (data ?? []) as CampaignRow[];
    },
  });
}

export function useCampaignRoster(campaignId: string) {
  return useQuery({
    queryKey: adminKeys.roster(campaignId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_campaign_clippers", { _campaign_id: campaignId });
      if (error) throw error;
      return (data ?? []) as RosterRow[];
    },
  });
}

export function useClipperApplicants() {
  return useQuery({
    queryKey: adminKeys.clippers,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_clipper_applications");
      if (error) throw error;
      return (data ?? []) as ClipperApplicant[];
    },
  });
}

export function useSlotApplications(campaignId?: string) {
  return useQuery({
    queryKey: adminKeys.applications(campaignId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_slot_applications", {
        ...(campaignId ? { _campaign_id: campaignId } : {}),
        _only_pending: true,
      });
      if (error) throw error;
      return (data ?? []) as unknown as SlotApplication[];
    },
  });
}

/** Approve (go live) or reject a funded campaign, then email the brand. */
export function useCampaignDecision(campaignId: string) {
  const queryClient = useQueryClient();
  const sendEmail = useServerFn(sendCampaignEmail);

  const notify = async (kind: "campaign_live" | "campaign_rejected", reason?: string) => {
    try {
      const res = await sendEmail({ data: { campaignId, kind, ...(reason ? { reason } : {}) } });
      if (res.sent) toast.success(`Email sent to ${res.to}`);
      else toast.warning(`Email queued — ${res.reason}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Email failed");
    }
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.reviewQueue });
    queryClient.invalidateQueries({ queryKey: adminKeys.campaigns });
    queryClient.invalidateQueries({ queryKey: ["admin-platform-overview"] });
  };

  const approve = useMutation({
    mutationFn: async (days: number | null) => {
      const { error } = await supabase.rpc("admin_approve_campaign", {
        _campaign_id: campaignId,
        ...(days && days > 0 ? { _duration_days: Math.floor(days) } : {}),
      });
      if (error) throw error;
      await notify("campaign_live");
    },
    onSuccess: () => {
      toast.success("Campaign is live");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (reason: string) => {
      const why = reason.trim();
      if (!why) throw new Error("Give a rejection reason");
      const { error } = await supabase.rpc("admin_reject_campaign", { _campaign_id: campaignId, _reason: why });
      if (error) throw error;
      await notify("campaign_rejected", why);
    },
    onSuccess: () => {
      toast.success("Campaign declined");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { approve, reject };
}

function useRefreshAfterDecision() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-slot-applications"] });
    queryClient.invalidateQueries({ queryKey: ["admin-campaign-roster"] });
    queryClient.invalidateQueries({ queryKey: adminKeys.campaigns });
    queryClient.invalidateQueries({ queryKey: adminKeys.flags });
  };
}

export function useAcceptApplication() {
  const refresh = useRefreshAfterDecision();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase.rpc("admin_accept_application", { _application_id: applicationId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clipper accepted into the campaign");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeclineApplication() {
  const refresh = useRefreshAfterDecision();
  return useMutation({
    mutationFn: async (input: { applicationId: string; reason: string }) => {
      const { error } = await supabase.rpc("admin_decline_application", {
        _application_id: input.applicationId,
        _reason: input.reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application declined");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
