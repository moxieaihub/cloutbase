import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type Package = {
  id: string;
  name: string;
  view_range_low: number;
  view_range_high: number;
  price_to_brand: number;
  slots: number;
  duration_days: number;
  sort_order: number;
  is_active: boolean;
};

export type BrandCampaign = {
  campaign_id: string;
  title: string;
  status: string;
  funded: boolean;
  reject_reason: string | null;
  package_name: string | null;
  price: number;
  guaranteed_views: number;
  slots: number;
  slots_taken: number;
  clipper_count: number;
  clip_count: number;
  confirmed_views: number;
  pending_views: number;
  confirmed_tiktok: number;
  confirmed_ig: number;
  confirmed_youtube: number;
  ends_at: string | null;
  created_at: string;
};

export type BrandClip = {
  id: string;
  username: string | null;
  platform: string;
  clip_link: string;
  posted_at: string;
  confirms_on: string;
  state: "confirmed" | "confirming" | "removed";
  views: number;
};

export type BrandProfileRow = {
  user_id: string;
  company_name: string | null;
  website: string | null;
  whatsapp: string | null;
  about: string | null;
};

export const brandKeys = {
  packages: ["packages"] as const,
  campaigns: ["brand-campaign-analytics"] as const,
  clips: (id: string) => ["brand-campaign-clips", id] as const,
  own: (id: string, userId: string) => ["brand-own-campaign", id, userId] as const,
  profile: (userId: string) => ["brand-profile", userId] as const,
  username: (userId: string) => ["brand-username", userId] as const,
};

export function usePackages() {
  return useQuery({
    queryKey: brandKeys.packages,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("id, name, view_range_low, view_range_high, price_to_brand, slots, duration_days, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Package[];
    },
  });
}

export function useBrandCampaigns() {
  return useQuery({
    queryKey: brandKeys.campaigns,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("brand_campaign_analytics");
      if (error) throw error;
      return (data ?? []) as unknown as BrandCampaign[];
    },
  });
}

export function useBrandClips(campaignId: string) {
  return useQuery({
    queryKey: brandKeys.clips(campaignId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("brand_campaign_clips", { _campaign_id: campaignId });
      if (error) throw error;
      return (data ?? []) as unknown as BrandClip[];
    },
  });
}

/** The brand's own campaign row, for the payment page. */
export function useOwnCampaign(campaignId: string, userId: string) {
  return useQuery({
    queryKey: brandKeys.own(campaignId, userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, budget, funded, status, package_id, guaranteed_views, duration_days, slots")
        .eq("id", campaignId)
        .eq("brand_user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export type NewCampaignInput = {
  packageId: string;
  title: string;
  sourceLink: string;
  videoLength: number;
  kpiTarget: string;
  platforms: string[];
  caption: string;
  hashtags: string;
  brandTag: string;
  ctaLink: string;
  watermarkPath: string | null;
};

export function useCreateCampaign() {
  return useMutation({
    mutationFn: async (i: NewCampaignInput) => {
      const { data, error } = await supabase.rpc("create_campaign_from_package", {
        _package_id: i.packageId,
        _title: i.title,
        _source_file_link: i.sourceLink,
        _video_length_minutes: i.videoLength,
        _kpi_target: i.kpiTarget,
        _target_platforms: i.platforms as never,
        _caption: i.caption,
        _hashtags: i.hashtags,
        _brand_tag: i.brandTag,
        _cta_link: i.ctaLink,
        ...(i.watermarkPath ? { _watermark_url: i.watermarkPath } : {}),
      });
      if (error) throw error;
      return data as string;
    },
  });
}

export function useDiscardDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId).eq("funded", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.campaigns }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBrandUsername(userId: string) {
  return useQuery({
    queryKey: brandKeys.username(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data?.username ?? null;
    },
  });
}

export function useBrandProfile(userId: string) {
  return useQuery({
    queryKey: brandKeys.profile(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_profiles")
        .select("user_id, company_name, website, whatsapp, about")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BrandProfileRow | null;
    },
  });
}

export function useSaveBrandProfile(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (v: Omit<BrandProfileRow, "user_id">) => {
      const clean = (s: string | null) => (s ?? "").trim() || null;
      const { error } = await supabase.from("brand_profiles").upsert(
        {
          user_id: userId,
          company_name: clean(v.company_name),
          website: clean(v.website),
          whatsapp: clean(v.whatsapp),
          about: clean(v.about),
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: brandKeys.profile(userId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
