import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { referralLink } from "@/lib/terms";

export function ReferralBlock() {
  const { data } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: async () => {
      const { data: code, error } = await supabase.rpc("my_referral_code");
      if (error) throw error;
      const { data: stats, error: statsError } = await supabase.rpc("my_referral_stats");
      if (statsError) throw statsError;
      return { code: code as string, total: stats?.[0]?.total ?? 0 };
    },
  });

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Refer a clipper</h2>
      {!data ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-3 rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Your referral link</p>
          <p className="mt-1 break-all text-sm">{referralLink(data.code)}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {data.total} clipper{data.total === 1 ? "" : "s"} joined with your link
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(referralLink(data.code));
                toast.success("Referral link copied");
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
