import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type InitInput = { courseId: string; callbackUrl?: string };
type ConfirmInput = { courseId: string; reference: string };

/**
 * Starts payment for a course. When Paystack keys are configured a real
 * checkout is initialised; otherwise the caller gets a placeholder reference
 * that must still be confirmed before access is granted.
 */
export const initCoursePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: InitInput) => {
    if (!input?.courseId) throw new Error("courseId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select("id, title, price, is_published")
      .eq("id", data.courseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!course || !course.is_published) throw new Error("Course not available");

    const { data: existing } = await supabaseAdmin
      .from("course_purchases")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) return { mode: "owned" as const, reference: null, authorizationUrl: null };

    const reference = `cb_course_${course.id.slice(0, 8)}_${context.userId.slice(0, 8)}_${Date.now()}`;
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    const { data: config } = await supabaseAdmin
      .from("paystack_config")
      .select("enabled, provider")
      .maybeSingle();

    if (secret && config?.enabled && config.provider === "paystack") {
      const email = (context.claims as { email?: string } | null)?.email;
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Math.round(Number(course.price) * 100),
          currency: "NGN",
          reference,
          callback_url: data.callbackUrl,
          metadata: { course_id: course.id, user_id: context.userId },
        }),
      });
      const body = (await res.json()) as {
        status?: boolean;
        message?: string;
        data?: { authorization_url?: string };
      };
      if (!res.ok || !body.status || !body.data?.authorization_url) {
        throw new Error(body.message || "Could not start the Paystack checkout");
      }
      return {
        mode: "paystack" as const,
        reference,
        authorizationUrl: body.data.authorization_url,
      };
    }

    return { mode: "placeholder" as const, reference, authorizationUrl: null };
  });

/**
 * Confirms a course payment and grants permanent access. With Paystack keys in
 * place the reference is verified against Paystack before anything is written.
 */
export const confirmCoursePurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ConfirmInput) => {
    if (!input?.courseId) throw new Error("courseId is required");
    if (!input?.reference) throw new Error("reference is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: course, error } = await supabaseAdmin
      .from("courses")
      .select("id, price, is_published")
      .eq("id", data.courseId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!course || !course.is_published) throw new Error("Course not available");

    const { data: existing } = await supabaseAdmin
      .from("course_purchases")
      .select("id")
      .eq("course_id", course.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) return { unlocked: true, alreadyOwned: true, verified: true };

    const secret = process.env["PAYSTACK_SECRET_KEY"];
    const { data: config } = await supabaseAdmin
      .from("paystack_config")
      .select("enabled, provider")
      .maybeSingle();

    let amountPaid = Number(course.price);
    let verified = false;

    if (secret && config?.enabled && config.provider === "paystack") {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      const body = (await res.json()) as {
        status?: boolean;
        data?: {
          status?: string;
          amount?: number;
          metadata?: { course_id?: string; user_id?: string };
        };
      };
      const tx = body.data;
      if (!res.ok || !body.status || tx?.status !== "success") {
        throw new Error("Payment not confirmed by Paystack");
      }
      if (tx.metadata?.course_id !== course.id || tx.metadata?.user_id !== context.userId) {
        throw new Error("This payment does not belong to this course");
      }
      if (Number(tx.amount ?? 0) < Math.round(Number(course.price) * 100)) {
        throw new Error("Amount paid is less than the course price");
      }
      amountPaid = Number(tx.amount) / 100;
      verified = true;
    }

    const { error: insertError } = await supabaseAdmin.from("course_purchases").insert({
      user_id: context.userId,
      course_id: course.id,
      amount_paid: amountPaid,
      paystack_ref: data.reference,
    });
    if (insertError && !insertError.message.includes("duplicate")) {
      throw new Error(insertError.message);
    }

    return { unlocked: true, alreadyOwned: false, verified };
  });
