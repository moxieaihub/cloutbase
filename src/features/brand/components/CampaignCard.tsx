import { Link } from "@tanstack/react-router";

import { formatCompact } from "@/lib/campaign";
import { countdown } from "@/lib/clipper";
import { campaignStage } from "../format";
import type { BrandCampaign } from "../queries";
import { ProgressBar } from "./ProgressBar";

export function CampaignCard({ c }: { c: BrandCampaign }) {
  const confirmed = Number(c.confirmed_views);
  const pending = Number(c.pending_views);
  const target = Number(c.guaranteed_views);
  const needsPayment = !c.funded && c.status === "pending_review";

  return (
    <article className="rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">{c.title}</h2>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            needsPayment ? "border-[#4DA3FF]/50 text-[#4DA3FF]" : "border-border text-muted-foreground"
          }`}
        >
          {campaignStage(c)}
        </span>
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight">
        {formatCompact(confirmed)}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          confirmed delivered views{target > 0 ? ` of ${formatCompact(target)} guaranteed` : ""}
        </span>
      </p>
      {target > 0 ? (
        <div className="mt-3">
          <ProgressBar confirmed={confirmed} pending={pending} target={target} />
        </div>
      ) : null}
      {pending > 0 ? (
        <p className="mt-2 text-[11px] text-muted-2">+ {formatCompact(pending)} confirming (inside the 5-day window)</p>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        {c.package_name ? `${c.package_name} · ` : ""}
        {c.clipper_count} clippers · {c.clip_count} clips
        {c.ends_at ? ` · ${countdown(c.ends_at)}` : ""}
      </p>

      {c.status === "rejected" && c.reject_reason ? (
        <p className="mt-3 rounded-xl border border-border p-3 text-xs text-muted-foreground">Reason: {c.reject_reason}</p>
      ) : null}

      <div className="mt-4">
        {needsPayment ? (
          <Link
            to="/business/pay/$campaignId"
            params={{ campaignId: c.campaign_id }}
            className="inline-block rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background"
          >
            Pay now
          </Link>
        ) : (
          <Link
            to="/business/analytics/$campaignId"
            params={{ campaignId: c.campaign_id }}
            className="inline-block rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:border-foreground"
          >
            View analytics
          </Link>
        )}
      </div>
    </article>
  );
}
