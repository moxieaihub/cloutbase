import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  role: z.enum(["business", "clipper", "admin"]),
});

/**
 * Demo mode: mints throwaway credentials for a preview account.
 * TEMPORARY — remove before opening signups to the public.
 */
export const startDemoSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { ensureDemoAccount } = await import("./demo.server");
    return ensureDemoAccount(data.role);
  });
