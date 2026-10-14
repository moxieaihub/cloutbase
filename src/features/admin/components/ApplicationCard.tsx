import { useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatViews, formatTimestamp } from "@/lib/views";
import { useAcceptApplication, useDeclineApplication, type SlotApplication } from "../queries";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

export function ApplicationCard({ app, showCampaign = true }: { app: SlotApplication; showCampaign?: boolean }) {
  const accept = useAcceptApplication();
  const decline = useDeclineApplication();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const full = app.slots_taken >= app.campaign_slots;
  const busy = accept.isPending || decline.isPending;

  return (
    <li className="rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            @{app.username ?? "clipper"}
            {app.real_name ? <span className="text-muted-foreground"> · {app.real_name}</span> : null}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {app.email ?? "no email"}
            {app.whatsapp ? ` · WhatsApp ${app.whatsapp}` : ""}
          </p>
        </div>
        <p className="shrink-0 text-[11px] text-muted-2">Applied {formatTimestamp(app.applied_at)}</p>
      </div>

      {showCampaign ? (
        <p className="mt-3 text-xs">
          For{" "}
          <Link
            to="/admin/campaigns/$campaignId"
            params={{ campaignId: app.campaign_id }}
            className="underline underline-offset-4"
          >
            {app.campaign_title}
          </Link>{" "}
          <span className="text-muted-foreground">
            · {app.slots_taken}/{app.campaign_slots} slots filled
          </span>
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Average views" value={formatViews(Number(app.avg_views))} />
        <Stat label="Lifetime views" value={formatViews(Number(app.lifetime_views))} />
        <Stat label="Followers" value={Number(app.followers_count).toLocaleString()} />
        <Stat label="Strikes" value={String(app.strikes)} />
      </div>

      {app.accounts.length > 0 ? (
        <ul className="mt-4 space-y-1 border-t border-border pt-3 text-xs">
          {app.accounts.map((a) => (
            <li key={`${a.platform}-${a.handle}`} className="flex justify-between gap-3">
              <span className="capitalize">{a.platform} · @{a.handle}</span>
              <span className="text-muted-foreground">
                {Number(a.followers).toLocaleString()} followers · {formatViews(Number(a.avg_views))} avg
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">No linked accounts.</p>
      )}

      {app.banned ? <p className="mt-3 text-xs text-[#4DA3FF]">This clipper is banned — they can’t be accepted.</p> : null}
      {full ? <p className="mt-3 text-xs text-muted-foreground">Campaign is full — no slot to give.</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button size="sm" disabled={busy || full || app.banned} onClick={() => accept.mutate(app.application_id)}>
          {accept.isPending ? "Accepting…" : "Accept into campaign"}
        </Button>
        {declining ? (
          <>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for declining"
              className="h-9 max-w-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={busy || !reason.trim()}
              onClick={() => decline.mutate({ applicationId: app.application_id, reason })}
            >
              {decline.isPending ? "Declining…" : "Confirm decline"}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setDeclining(true)}>
            Decline
          </Button>
        )}
      </div>
    </li>
  );
}
