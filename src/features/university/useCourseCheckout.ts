import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { confirmCoursePurchase, initCoursePayment } from "@/lib/courses.functions";
import { uniKeys } from "./queries";

/** Everything payment-related for one course: start checkout, confirm a return. */
export function useCourseCheckout(courseId: string, userId: string) {
  const queryClient = useQueryClient();
  const initPayment = useServerFn(initCoursePayment);
  const confirmPurchase = useServerFn(confirmCoursePurchase);
  const [paying, setPaying] = useState(false);

  const refreshOwnership = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: uniKeys.owns(courseId, userId) });
    queryClient.invalidateQueries({ queryKey: uniKeys.owned(userId) });
  }, [queryClient, courseId, userId]);

  /** Called when Paystack sends the buyer back with ?reference= */
  const confirm = useCallback(
    async (reference: string) => {
      await confirmPurchase({ data: { courseId, reference } });
      toast.success("Course unlocked — enjoy!");
      refreshOwnership();
    },
    [confirmPurchase, courseId, refreshOwnership],
  );

  async function unlock() {
    setPaying(true);
    try {
      const callbackUrl = `${window.location.origin}/university/${courseId}`;
      const started = await initPayment({ data: { courseId, callbackUrl } });

      if (started.mode === "owned") {
        refreshOwnership();
        return;
      }
      if (started.mode === "paystack" && started.authorizationUrl) {
        window.location.href = started.authorizationUrl;
        return;
      }
      // Only free (₦0) courses skip the gateway. Anything else that isn't
      // Paystack is an error — never unlock without a verified payment.
      if (started.mode === "free" && started.reference) {
        await confirm(started.reference);
        return;
      }
      throw new Error("Could not start checkout. Please try again.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaying(false);
    }
  }

  return { paying, unlock, confirm };
}
