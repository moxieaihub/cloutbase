import { createFileRoute } from "@tanstack/react-router";

type ChargeEvent = {
  event?: string;
  data?: {
    status?: string;
    reference?: string;
    amount?: number;
    metadata?: { course_id?: string; campaign_id?: string; user_id?: string; purpose?: string };
  };
};

const ok = (body = "ok") => new Response(body, { status: 200 });

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("Payments not configured", { status: 500 });

        // 1. Only Paystack can sign this: HMAC-SHA512 of the raw body with our secret key.
        const raw = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const { createHmac, timingSafeEqual } = await import("node:crypto");
        const expected = createHmac("sha512", secret).update(raw).digest("hex");
        const given = Buffer.from(signature);
        const wanted = Buffer.from(expected);
        if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: ChargeEvent;
        try {
          event = JSON.parse(raw) as ChargeEvent;
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        if (event.event !== "charge.success" || event.data?.status !== "success") return ok("ignored");

        const tx = event.data;
        const meta = tx.metadata ?? {};
        const reference = tx.reference ?? "";
        const paidKobo = Number(tx.amount ?? 0);
        if (!reference || !meta.user_id) return ok("ignored");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          // 2a. A course purchase.
          if (meta.course_id) {
            const { data: course } = await supabaseAdmin
              .from("courses")
              .select("id, price")
              .eq("id", meta.course_id)
              .maybeSingle();
            if (!course) return ok("unknown course");
            if (paidKobo < Math.round(Number(course.price) * 100)) return ok("underpaid");

            const { data: existing } = await supabaseAdmin
              .from("course_purchases")
              .select("id")
              .eq("user_id", meta.user_id)
              .eq("course_id", course.id)
              .maybeSingle();
            if (!existing) {
              const { error } = await supabaseAdmin.from("course_purchases").insert({
                user_id: meta.user_id,
                course_id: course.id,
                amount_paid: paidKobo / 100,
                paystack_ref: reference,
              });
              if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
            }
            return ok();
          }

          // 2b. A brand funding a campaign.
          if (meta.purpose === "campaign_funding" && meta.campaign_id) {
            const { data: campaign } = await supabaseAdmin
              .from("campaigns")
              .select("id, brand_user_id, budget, funded")
              .eq("id", meta.campaign_id)
              .maybeSingle();
            if (!campaign || campaign.brand_user_id !== meta.user_id) return ok("unknown campaign");
            if (campaign.funded) return ok("already funded");
            if (paidKobo < Math.round(Number(campaign.budget) * 100)) return ok("underpaid");

            const { error } = await supabaseAdmin
              .from("campaigns")
              .update({ funded: true, funded_at: new Date().toISOString(), funding_reference: reference })
              .eq("id", campaign.id)
              .eq("funded", false);
            if (error && !/duplicate/i.test(error.message)) throw new Error(error.message);
            return ok();
          }
        } catch (e) {
          // A non-200 makes Paystack retry the webhook later.
          return new Response(e instanceof Error ? e.message : "Failed", { status: 500 });
        }

        return ok("ignored");
      },
    },
  },
});
