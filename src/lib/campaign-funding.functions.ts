import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type InitInput = { campaignId: string; callbackUrl?: string };
type ConfirmInput = { campaignId: string; reference: string };

async function paystackSecret(
  supabaseAdmin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
) {
  const secret = process.env["PAYSTACK_SECRET_KEY"];
  const { data: config } = await supabaseAdmin.from("paystack_config").select("enabled, provider").maybeSingle();
  return secret && config?.enabled && config.provider === "paystack" ? secret : null;
}

/** Starts a Paystack checkout for the full package price (held as escrow). */
export const initCampaignFunding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: InitInput) => {
    if (!input?.campaignId) throw new Error("campaignId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign, error } = await supabaseAdmin
      .from("campaigns")
      .select("id, brand_user_id, budget, funded, status")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign || campaign.brand_user_id !== context.userId) throw new Error("Campaign not found");
    if (campaign.funded) return { mode: "funded" as const, reference: null, authorizationUrl: null };
    if (campaign.status !== "pending_review") throw new Error("This campaign can no longer be paid for");

    const secret = await paystackSecret(supabaseAdmin);
    if (!secret) {
      // No free "placeholder" funding — that would let anyone launch campaigns for nothing.
      throw new Error("Online payment isn’t switched on yet. Contact Cloutbase to pay by bank transfer.");
    }

    const reference = `cb_camp_${campaign.id.slice(0, 8)}_${Date.now()}`;
    const email = (context.claims as { email?: string } | null)?.email;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(campaign.budget) * 100),
        currency: "NGN",
        reference,
        callback_url: data.callbackUrl,
        metadata: { campaign_id: campaign.id, user_id: context.userId, purpose: "campaign_funding" },
      }),
    });
    const body = (await res.json()) as { status?: boolean; message?: string; data?: { authorization_url?: string } };
    if (!res.ok || !body.status || !body.data?.authorization_url) {
      throw new Error(body.message || "Could not start the Paystack checkout");
    }
    return { mode: "paystack" as const, reference, authorizationUrl: body.data.authorization_url };
  });

/** Verifies the payment with Paystack, then marks the campaign funded (→ admin review). */
export const confirmCampaignFunding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ConfirmInput) => {
    if (!input?.campaignId) throw new Error("campaignId is required");
    if (!input?.reference) throw new Error("reference is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign, error } = await supabaseAdmin
      .from("campaigns")
      .select("id, brand_user_id, budget, funded")
      .eq("id", data.campaignId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign || campaign.brand_user_id !== context.userId) throw new Error("Campaign not found");
    if (campaign.funded) return { funded: true, alreadyFunded: true };

    const secret = await paystackSecret(supabaseAdmin);
    if (!secret) throw new Error("Online payment isn’t switched on yet.");

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = (await res.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; metadata?: { campaign_id?: string; user_id?: string } };
    };
    const tx = body.data;
    if (!res.ok || !body.status || tx?.status !== "success") throw new Error("Payment not confirmed by Paystack");
    if (tx.metadata?.campaign_id !== campaign.id || tx.metadata?.user_id !== context.userId) {
      throw new Error("This payment does not belong to this campaign");
    }
    if (Number(tx.amount ?? 0) < Math.round(Number(campaign.budget) * 100)) {
      throw new Error("Amount paid is less than the package price");
    }

    const { error: updateError } = await supabaseAdmin
      .from("campaigns")
      .update({ funded: true, funded_at: new Date().toISOString(), funding_reference: data.reference })
      .eq("id", campaign.id)
      .eq("funded", false);
    if (updateError) throw new Error(updateError.message);
    return { funded: true, alreadyFunded: false };
  });
