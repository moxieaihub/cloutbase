import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CampaignEmailKind = "campaign_live" | "campaign_rejected" | "performance_report";

type Input = {
  campaignId: string;
  kind: CampaignEmailKind;
  reason?: string;
};

const num = (v: number | null | undefined) => Number(v ?? 0).toLocaleString("en-NG");

/**
 * Sends a campaign email to the brand through the admin-configured external
 * email service. Nothing is faked: when no service is configured the email is
 * logged as "queued" and the caller is told it was not delivered.
 *
 * Brands never see the internal split (clipper pool, per-clipper cap,
 * commission) — emails talk about guaranteed and confirmed views only.
 */
export const sendCampaignEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Input) => {
    if (!input?.campaignId) throw new Error("campaignId is required");
    if (!["campaign_live", "campaign_rejected", "performance_report"].includes(input.kind)) {
      throw new Error("Unknown email kind");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (roleError) throw new Error(roleError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .select("id, title, slots, ends_at, reject_reason, brand_user_id, guaranteed_views")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (campaignError) throw new Error(campaignError.message);
    if (!campaign) throw new Error("Campaign not found");

    // Admins can send anything; a brand may email itself its own performance report.
    const isOwnerReport =
      data.kind === "performance_report" && campaign.brand_user_id === context.userId;
    if (!isAdmin && !isOwnerReport) throw new Error("Not allowed");

    const { data: brand, error: brandError } = await supabaseAdmin
      .from("profiles")
      .select("username, email")
      .eq("id", campaign.brand_user_id)
      .maybeSingle();
    if (brandError) throw new Error(brandError.message);
    if (!brand?.email) throw new Error("Brand has no email on file");

    const hello = `Hi ${brand.username ?? "there"},`;
    const guaranteed = Number(campaign.guaranteed_views ?? 0);
    let subject: string;
    let body: string;

    if (data.kind === "campaign_live") {
      subject = `Your campaign "${campaign.title}" is live`;
      body = [
        hello,
        "",
        `Your campaign "${campaign.title}" has been reviewed and is now live on Cloutbase.`,
        guaranteed > 0 ? `Guaranteed views: ${num(guaranteed)}` : "",
        `Clipper accounts: ${campaign.slots}`,
        campaign.ends_at ? `Runs until: ${new Date(campaign.ends_at).toDateString()}` : "",
        "",
        "You can follow confirmed delivered views from your Cloutbase dashboard.",
        "— Cloutbase",
      ]
        .filter(Boolean)
        .join("\n");
    } else if (data.kind === "campaign_rejected") {
      const reason = (data.reason ?? campaign.reject_reason ?? "").trim();
      if (!reason) throw new Error("A rejection reason is required");
      subject = `Your campaign "${campaign.title}" was not approved`;
      body = [
        hello,
        "",
        `We reviewed "${campaign.title}" and could not approve it.`,
        "",
        `Reason: ${reason}`,
        "",
        "Your funds are held and will be refunded or reallocated once you reply to this email.",
        "— Cloutbase",
      ].join("\n");
    } else {
      const { data: clips, error: clipsError } = await supabaseAdmin
        .from("clip_submissions")
        .select(
          "platform, view_count, snapshot_view_count, counts_from, posted_at, deleted_before_snapshot, clipper_user_id",
        )
        .eq("campaign_id", campaign.id);
      if (clipsError) throw new Error(clipsError.message);

      // Same 5-day rule as the brand dashboard: confirmed, still confirming, or removed.
      const now = Date.now();
      const rows = (clips ?? []).map((r) => {
        const confirmsAt = r.counts_from
          ? new Date(r.counts_from).getTime()
          : new Date(r.posted_at).getTime() + 5 * 86_400_000;
        const removed = Boolean(r.deleted_before_snapshot);
        const confirmed = !removed && confirmsAt <= now;
        const views = removed
          ? 0
          : confirmed
            ? Number(r.snapshot_view_count ?? r.view_count ?? 0)
            : Number(r.view_count ?? 0);
        return {
          platform: r.platform as string,
          clipper: r.clipper_user_id as string,
          removed,
          confirmed,
          views,
        };
      });

      const confirmedViews = (platform?: string) =>
        rows
          .filter((r) => r.confirmed && (!platform || r.platform === platform))
          .reduce((sum, r) => sum + r.views, 0);
      const confirming = rows
        .filter((r) => !r.confirmed && !r.removed)
        .reduce((sum, r) => sum + r.views, 0);
      const counted = rows.filter((r) => !r.removed);
      const clippers = new Set(counted.map((r) => r.clipper)).size;

      subject = `Performance report — ${campaign.title}`;
      body = [
        hello,
        "",
        `Here is the delivery report for "${campaign.title}".`,
        "",
        `Confirmed delivered views: ${num(confirmedViews())}${guaranteed > 0 ? ` of ${num(guaranteed)} guaranteed` : ""}`,
        `TikTok: ${num(confirmedViews("tiktok"))}`,
        `Instagram: ${num(confirmedViews("ig"))}`,
        `YouTube: ${num(confirmedViews("youtube"))}`,
        "",
        `Still confirming: ${num(confirming)} (counts once each clip has stayed live 5 days)`,
        `Clips: ${num(counted.length)} from ${num(clippers)} clippers`,
        "",
        "— Cloutbase",
      ].join("\n");
    }

    const { data: config, error: configError } = await supabaseAdmin
      .from("email_config")
      .select("enabled, provider_name, endpoint, from_email, from_name, api_key_secret_name")
      .eq("id", true)
      .maybeSingle();
    if (configError) throw new Error(configError.message);

    const { deliverEmail } = await import("./email.server");
    const result = config
      ? await deliverEmail(config, { to: brand.email, subject, body })
      : ({ sent: false, reason: "Email Service API is not configured yet." } as const);

    await supabaseAdmin.from("email_log").insert({
      to_email: brand.email,
      subject,
      body,
      kind: data.kind,
      campaign_id: campaign.id,
      status: result.sent ? "sent" : "queued",
      error: result.sent ? null : result.reason,
      sent_at: result.sent ? new Date().toISOString() : null,
    });

    return result.sent
      ? { sent: true as const, to: brand.email }
      : { sent: false as const, to: brand.email, reason: result.reason };
  });
