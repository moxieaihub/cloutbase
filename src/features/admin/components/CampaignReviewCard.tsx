import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNaira } from "@/lib/campaign";
import { formatTimestamp } from "@/lib/views";
import { useCampaignDecision, type ReviewRow } from "../queries";
import { Detail, Field } from "./Detail";

export function CampaignReviewCard({ campaign }: { campaign: ReviewRow }) {
  const { approve, reject } = useCampaignDecision(campaign.id);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(String(campaign.duration_days ?? 7));
  const busy = approve.isPending || reject.isPending;

  return (
    <li className="rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{campaign.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {campaign.brand_username} · {campaign.brand_email ?? "no email"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[#4DA3FF]/40 px-2 py-1 text-[11px] text-[#4DA3FF]">
          Funded ✓
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Field label="Budget" value={formatNaira(Number(campaign.budget))} money />
        <Field label="Clipper pool" value={formatNaira(Number(campaign.clipper_pool))} money />
        <Field label="Earn up to" value={formatNaira(Number(campaign.per_clipper_ceiling))} money />
        <Field label="Rate" value={`${formatNaira(Number(campaign.rate_per_1000_views))} / 1,000 views`} />
        <Field label="Slots" value={String(campaign.slots)} />
        <Field label="KPI target" value={campaign.kpi_target ?? "—"} />
        <Field label="Video length" value={campaign.video_length_minutes ? `${campaign.video_length_minutes} min` : "—"} />
        <Field label="Submitted" value={formatTimestamp(campaign.created_at)} />
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
        <Detail label="Source file" value={campaign.source_file_link} link />
        <Detail label="Caption" value={campaign.caption} />
        <Detail label="Hashtags" value={campaign.hashtags} />
        <Detail label="Brand tag" value={campaign.brand_tag} />
        <Detail label="CTA link" value={campaign.cta_link} link />
        <Detail label="Watermark" value={campaign.watermark_url} link />
      </div>

      <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`days-${campaign.id}`} className="text-xs">Run for (days)</Label>
          <Input id={`days-${campaign.id}`} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
          <Button size="sm" disabled={busy} onClick={() => approve.mutate(Number(days) || null)}>
            {approve.isPending ? "Approving…" : "Accept & go live"}
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`reason-${campaign.id}`} className="text-xs">Reason for declining</Label>
          <Input
            id={`reason-${campaign.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this campaign declined?"
          />
          <Button size="sm" variant="outline" disabled={busy} onClick={() => reject.mutate(reason)}>
            {reject.isPending ? "Declining…" : "Decline"}
          </Button>
        </div>
      </div>
    </li>
  );
}
