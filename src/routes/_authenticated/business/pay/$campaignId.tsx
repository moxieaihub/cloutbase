import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { BrandShell } from "@/features/brand/components/BrandShell";
import { weeks } from "@/features/brand/format";
import { brandKeys, useDiscardDraft, useOwnCampaign, usePackages } from "@/features/brand/queries";
import { formatCompact, formatNaira } from "@/lib/campaign";
import { confirmCampaignFunding, initCampaignFunding } from "@/lib/campaign-funding.functions";

type Search = { ref?: string | undefined };

const pick = (s: Record<string, unknown>, key: string) =>
  typeof s[key] === "string" ? (s[key] as string) : undefined;

export const Route = createFileRoute("/_authenticated/business/pay/$campaignId")({
  // Paystack returns the brand with ?reference=…&trxref=… (not ?ref=). Accept all three.
  validateSearch: (s: Record<string, unknown>): Search => ({
    ref: pick(s, "reference") ?? pick(s, "trxref") ?? pick(s, "ref"),
  }),
  head: () => ({
    meta: [
      { title: "Pay & start your campaign — Cloutbase" },
      { name: "description", content: "Your payment is held in escrow while your campaign runs." },
    ],
  }),
  component: Escrow,
});

function Escrow() {
  const { campaignId } = Route.useParams();
  const { ref } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initFunding = useServerFn(initCampaignFunding);
  const confirmFunding = useServerFn(confirmCampaignFunding);

  const { data: campaign, isLoading } = useOwnCampaign(campaignId, user.id);
  const { data: packages } = usePackages();
  const discard = useDiscardDraft();
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const pkg = (packages ?? []).find((p) => p.id === campaign?.package_id);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: brandKeys.own(campaignId, user.id) });
    queryClient.invalidateQueries({ queryKey: brandKeys.campaigns });
  }

  // Paystack sends the brand back with a reference — verify it on the server.
  useEffect(() => {
    if (!ref || !campaign || campaign.funded) return;
    let cancelled = false;
    setConfirming(true);
    (async () => {
      try {
        await confirmFunding({ data: { campaignId, reference: ref } });
        if (!cancelled) {
          toast.success("Payment received");
          refresh();
        }
      } catch (e) {
        if (!cancelled) toast.error((e as Error).message);
      } finally {
        if (!cancelled) {
          setConfirming(false);
          navigate({ to: ".", params: { campaignId }, search: {}, replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, campaign?.id, campaign?.funded]);

  async function pay() {
    setPaying(true);
    try {
      const res = await initFunding({
        data: { campaignId, callbackUrl: `${window.location.origin}/business/pay/${campaignId}` },
      });
      if (res.mode === "funded") {
        refresh();
        return;
      }
      if (res.authorizationUrl) window.location.href = res.authorizationUrl;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPaying(false);
    }
  }

  async function discardDraft() {
    if (!window.confirm("Discard this unpaid campaign?")) return;
    await discard.mutateAsync(campaignId);
    navigate({ to: "/business" });
  }

  return (
    <BrandShell back={{ to: "/business", label: "My campaigns" }}>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Pay &amp; start</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : !campaign ? (
        <p className="mt-6 text-sm text-muted-foreground">Campaign not found.</p>
      ) : campaign.funded ? (
        <section className="mt-6 max-w-lg rounded-2xl border border-[#4DA3FF]/40 p-6">
          <p className="text-sm font-semibold text-[#4DA3FF]">Payment received ✓</p>
          <p className="mt-2 text-sm text-muted-foreground">
            “{campaign.title}” is now in review. We’ll email you the moment it goes live.
          </p>
          <Link to="/business" className="mt-4 inline-block rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background">
            Back to my campaigns
          </Link>
        </section>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <section className="rounded-2xl border border-border p-6">
            <p className="text-xs text-muted-foreground">{campaign.title}</p>
            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#4DA3FF]">
              {formatCompact(Number(campaign.guaranteed_views ?? pkg?.view_range_low ?? 0))}
            </p>
            <p className="text-xs text-muted-foreground">guaranteed views</p>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Package</dt><dd className="font-medium">{pkg?.name ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Clipper accounts</dt><dd className="font-medium">{campaign.slots}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Platforms</dt><dd className="font-medium">TikTok · Instagram · YouTube</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{weeks(Number(campaign.duration_days ?? 14))}</dd></div>
            </dl>

            <ul className="mt-6 space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              <li>1. You pay once, securely, through Paystack.</li>
              <li>2. Your payment is held in escrow — it isn’t paid out to clippers while your campaign is being delivered.</li>
              <li>3. Cloutbase reviews your campaign, then sets it live.</li>
            </ul>
          </section>

          <aside className="rounded-2xl border border-border p-6">
            <p className="text-xs text-muted-foreground">Total to pay</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-price">{formatNaira(Number(campaign.budget))}</p>
            <button
              type="button"
              onClick={pay}
              disabled={paying || confirming}
              className="mt-5 w-full rounded-xl bg-foreground px-4 py-4 text-sm font-semibold text-background disabled:opacity-60"
            >
              {confirming ? "Confirming your payment…" : paying ? "Opening checkout…" : `Pay ${formatNaira(Number(campaign.budget))} securely`}
            </button>
            <button type="button" onClick={discardDraft} className="mt-3 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Discard this campaign
            </button>
            <p className="mt-4 text-center text-[11px] text-muted-2">Cloutbase retains a service commission from each campaign.</p>
          </aside>
        </div>
      )}
    </BrandShell>
  );
}
