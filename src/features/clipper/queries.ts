import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { isValidVideoLink } from "@/lib/campaign";
import type { Platform } from "@/lib/clipper";
import { TERMS_VERSION } from "@/lib/terms";

export const clipperKeys = {
  brief: (id: string) => ["clipper-brief", id] as const,
  feed: ["clipper-feed"] as const,
  application: (id: string, userId: string) => ["my-slot-application", id, userId] as const,
  applications: (userId: string) => ["my-slot-applications", userId] as const,
  accounts: (userId: string) => ["clipper-accounts-full", userId] as const,
  campaignClips: (id: string, userId: string) => ["my-clips", id, userId] as const,
  profile: (userId: string) => ["clipper-profile", userId] as const,
  earnings: (userId: string) => ["clipper-earnings", userId] as const,
  payouts: (userId: string) => ["clipper-payouts", userId] as const,
  username: (userId: string) => ["profile-username", userId] as const,
};

/* ---------------- campaigns ---------------- */

export function useCampaignFeed() {
  return useQuery({
    queryKey: clipperKeys.feed,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("clipper_campaign_feed");
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

export function useCampaignBrief(campaignId: string) {
  return useQuery({
    queryKey: clipperKeys.brief(campaignId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("clipper_campaign_brief", { _campaign_id: campaignId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    refetchInterval: 30_000,
  });
}
export type CampaignBrief = NonNullable<ReturnType<typeof useCampaignBrief>["data"]>;

export function useMyApplication(campaignId: string, userId: string) {
  return useQuery({
    queryKey: clipperKeys.application(campaignId, userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slot_applications")
        .select("status, decline_reason")
        .eq("campaign_id", campaignId)
        .eq("clipper_user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** campaign_id → "applied" | "accepted" | "declined", for the campaign cards. */
export function useMyApplications(userId: string) {
  return useQuery({
    queryKey: clipperKeys.applications(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("slot_applications")
        .select("campaign_id, status")
        .eq("clipper_user_id", userId);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r) => [r.campaign_id, r.status as string]));
    },
  });
}

export function useApplyForSlot(campaignId: string, userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error: termsError } = await supabase.from("terms_acceptances").insert({
        user_id: userId,
        kind: "campaign_rules",
        campaign_id: campaignId,
        version: TERMS_VERSION,
        user_agent: navigator.userAgent,
      });
      if (termsError && !termsError.message.includes("duplicate")) throw termsError;

      const { error } = await supabase.rpc("apply_for_slot", { _campaign_id: campaignId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application sent. We’ll let you know once it’s approved.");
      queryClient.invalidateQueries({ queryKey: clipperKeys.application(campaignId, userId) });
      queryClient.invalidateQueries({ queryKey: clipperKeys.applications(userId) });
      queryClient.invalidateQueries({ queryKey: clipperKeys.brief(campaignId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------------- clips ---------------- */

export function useMyCampaignClips(campaignId: string, userId: string) {
  return useQuery({
    queryKey: clipperKeys.campaignClips(campaignId, userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_submissions")
        .select(
          "id, platform, clip_link, view_count, earnings, paid, posted_at, counts_from, is_live, deleted_before_snapshot, snapshot_view_count, snapshot_taken_at, last_checked_at, watermark_verified, watermark_note",
        )
        .eq("campaign_id", campaignId)
        .eq("clipper_user_id", userId)
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type SubmitClipInput = {
  clipLink: string;
  account: LinkedAccount;
  allowedPlatforms: Platform[];
  isInhouse: boolean;
  watermarkConfirmed: boolean;
};

export function useSubmitClip(campaignId: string, userId: string, onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (i: SubmitClipInput) => {
      if (!isValidVideoLink(i.clipLink)) throw new Error("Paste a valid clip link");
      if (i.allowedPlatforms.length > 0 && !i.allowedPlatforms.includes(i.account.platform)) {
        throw new Error("This campaign does not run on that platform");
      }
      if (i.isInhouse && !i.watermarkConfirmed) {
        throw new Error("Confirm the Cloutbase watermark is on this clip");
      }
      const { error } = await supabase.from("clip_submissions").insert({
        campaign_id: campaignId,
        clipper_user_id: userId,
        platform: i.account.platform,
        clipper_account_id: i.account.id,
        clip_link: i.clipLink.trim(),
        watermark_confirmed: i.isInhouse ? i.watermarkConfirmed : true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clip submitted. It counts once it stays live 5 days.");
      queryClient.invalidateQueries({ queryKey: ["my-clips"] });
      queryClient.invalidateQueries({ queryKey: clipperKeys.brief(campaignId) });
      queryClient.invalidateQueries({ queryKey: clipperKeys.feed });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------------- linked accounts ---------------- */

export type LinkedAccount = {
  id: string;
  platform: Platform;
  handle: string;
  followers: number;
  avg_views: number;
};

export function useMyAccounts(userId: string) {
  return useQuery({
    queryKey: clipperKeys.accounts(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clipper_accounts")
        .select("id, platform, handle, followers, avg_views")
        .eq("clipper_user_id", userId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as LinkedAccount[];
    },
  });
}

export function useAddAccount(userId: string, onDone: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (i: { platform: Platform; handle: string; followers: number; avgViews: number }) => {
      const handle = i.handle.trim().replace(/^@/, "");
      if (!handle) throw new Error("Enter your handle");
      const { error } = await supabase.from("clipper_accounts").insert({
        clipper_user_id: userId,
        platform: i.platform,
        handle,
        followers: i.followers,
        avg_views: i.avgViews,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account linked");
      queryClient.invalidateQueries({ queryKey: clipperKeys.accounts(userId) });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveAccount(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clipper_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clipperKeys.accounts(userId) }),
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------------- profile, earnings, payouts ---------------- */

export function useUsername(userId: string) {
  return useQuery({
    queryKey: clipperKeys.username(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data?.username ?? null;
    },
  });
}

export function useClipperProfile(userId: string) {
  return useQuery({
    queryKey: clipperKeys.profile(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clipper_profiles")
        .select(
          "real_name, bank_name, bank_account_number, account_name, whatsapp, banned, strikes, is_approved, is_priority, is_inhouse, max_clips_per_day, rank, lifetime_views, followers_count, avg_views, applied_at, reject_reason",
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveBankDetails(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      realName: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
      whatsapp: string;
    }) => {
      const { error } = await supabase.from("clipper_profiles").upsert(
        {
          user_id: userId,
          real_name: v.realName.trim() || null,
          bank_name: v.bankName.trim() || null,
          bank_account_number: v.accountNumber.trim() || null,
          account_name: v.accountName.trim() || null,
          whatsapp: v.whatsapp.trim() || null,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment details saved");
      queryClient.invalidateQueries({ queryKey: clipperKeys.profile(userId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEarnings(userId: string) {
  return useQuery({
    queryKey: clipperKeys.earnings(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_submissions")
        .select("earnings, view_count, paid")
        .eq("clipper_user_id", userId);
      if (error) throw error;
      const rows = data ?? [];
      return {
        total: rows.reduce((s, r) => s + Number(r.earnings ?? 0), 0),
        unpaid: rows.filter((r) => !r.paid).reduce((s, r) => s + Number(r.earnings ?? 0), 0),
        clips: rows.length,
        views: rows.reduce((s, r) => s + Number(r.view_count ?? 0), 0),
      };
    },
  });
}

export function usePayouts(userId: string) {
  return useQuery({
    queryKey: clipperKeys.payouts(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("id, amount, status, released_at, hold_until, created_at")
        .eq("clipper_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ---------------- Official Clipper application ---------------- */

export function useApplyOfficial(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: { followers: number; avgViews: number; whatsapp: string }) => {
      const { error } = await supabase.rpc("apply_inhouse_clipper", {
        _followers: v.followers,
        _avg_views: v.avgViews,
        _whatsapp: v.whatsapp.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application sent — a Cloutbase admin will review it.");
      queryClient.invalidateQueries({ queryKey: clipperKeys.profile(userId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
