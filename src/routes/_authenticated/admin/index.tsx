import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { PlatformOverview } from "@/components/PlatformOverview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { sendCampaignEmail } from "@/lib/email.functions";
import { formatTimestamp } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Review queue — Cloutbase admin" },
      {
        name: "description",
        content:
          "Approve or reject funded Cloutbase campaigns and watch slot and view flags across the marketplace.",
      },
      { property: "og:title", content: "Review queue — Cloutbase admin" },
      {
        property: "og:description",
        content: "Approval gate for funded campaigns awaiting review on Cloutbase.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminReview,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading the review queue.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

type QueueRow = {
  id: string;
  title: string;
  brand_username: string;
  brand_email: string | null;
  budget: number;
  clipper_pool: number;
  per_clipper_ceiling: number;
  rate_per_1000_views: number;
  slots: number;
  kpi_target: string | null;
  caption: string | null;
  hashtags: string | null;
  brand_tag: string | null;
  cta_link: string | null;
  watermark_url: string | null;
  source_file_link: string | null;
  video_length_minutes: number | null;
  duration_days: number | null;
  funded: boolean;
  created_at: string;
};

type FlagRow = {
  kind: string;
  campaign_id: string;
  campaign_title: string;
  clipper_user_id: string;
  username: string;
  detail: string;
  at: string;
};

function AdminReview() {
  const { data: queue, isLoading } = useQuery({
    queryKey: ["admin-review-queue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_review_queue");
      if (error) throw error;
      return (data ?? []) as QueueRow[];
    },
  });

  const { data: flags } = useQuery({
    queryKey: ["admin-flags"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_flags");
      if (error) throw error;
      return (data ?? []) as FlagRow[];
    },
  });

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Control room</h1>
      <p className="mb-6 mt-2 text-xs text-muted-foreground">
        Platform-wide numbers, then the funded campaigns awaiting your approval.
      </p>
      <PlatformOverview />
      <h2 className="text-xl font-semibold tracking-tight">Review queue</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Only funded campaigns reach this queue. Approving sets the campaign live and stamps its
        deadline; rejecting requires a reason. The brand is emailed either way through the
        configured email service.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (queue ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Nothing awaiting review.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(queue ?? []).map((c) => (
            <ReviewCard key={c.id} campaign={c} />
          ))}
        </ul>
      )}

      <section className="mt-12">
        <h2 className="text-sm font-semibold tracking-tight">Flags</h2>
        {(flags ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No flags right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(flags ?? []).map((f, i) => (
              <li key={`${f.kind}-${f.campaign_id}-${f.clipper_user_id}-${i}`} className="rounded-xl border border-border p-3 text-xs">
                <p className="font-medium">
                  {f.kind === "slot_near_release" ? "Slot nearing auto-release" : "Clip under 1,000 views"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {f.username} · {f.campaign_title}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {f.detail} · {formatTimestamp(f.at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}

function ReviewCard({ campaign }: { campaign: QueueRow }) {
  const queryClient = useQueryClient();
  const sendEmail = useServerFn(sendCampaignEmail);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(String(campaign.duration_days ?? 7));

  const notifyEmail = async (kind: "campaign_live" | "campaign_rejected", why?: string) => {
    try {
      const res = await sendEmail({
        data: { campaignId: campaign.id, kind, ...(why ? { reason: why } : {}) },
      });
      if (res.sent) toast.success(`Email sent to ${res.to}`);
      else toast.warning(`Email queued — ${res.reason}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Email failed");
    }
  };

  const approve = useMutation({
    mutationFn: async () => {
      const parsed = Number(days);
      const { error } = await supabase.rpc("admin_approve_campaign", {
        _campaign_id: campaign.id,
        ...(Number.isFinite(parsed) && parsed > 0 ? { _duration_days: Math.floor(parsed) } : {}),
      });
      if (error) throw error;
      await notifyEmail("campaign_live");
    },
    onSuccess: () => {
      toast.success("Campaign is live");
      queryClient.invalidateQueries({ queryKey: ["admin-review-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async () => {
      const why = reason.trim();
      if (!why) throw new Error("Give a rejection reason");
      const { error } = await supabase.rpc("admin_reject_campaign", {
        _campaign_id: campaign.id,
        _reason: why,
      });
      if (error) throw error;
      await notifyEmail("campaign_rejected", why);
    },
    onSuccess: () => {
      toast.success("Campaign rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-review-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
        <span className="shrink-0 rounded-full border border-money/40 px-2 py-1 text-[11px] text-money">
          ✓ funded via Paystack
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
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

      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <div>
          <Label htmlFor={`days-${campaign.id}`} className="text-xs">
            Run for (days)
          </Label>
          <Input
            id={`days-${campaign.id}`}
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button size="sm" disabled={busy} onClick={() => approve.mutate()}>
          {approve.isPending ? "Approving…" : "Approve & Go Live"}
        </Button>

        <div>
          <Label htmlFor={`reason-${campaign.id}`} className="text-xs">
            Rejection reason
          </Label>
          <Input
            id={`reason-${campaign.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this campaign rejected?"
            className="mt-1"
          />
        </div>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => reject.mutate()}>
          {reject.isPending ? "Rejecting…" : "Reject"}
        </Button>
      </div>
    </li>
  );
}

function Field({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={`mt-1 font-medium ${money ? "text-money" : ""}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      {link ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer noopener"
          className="break-all underline underline-offset-4"
        >
          {value}
        </a>
      ) : (
        <p className="whitespace-pre-wrap break-words">{value}</p>
      )}
    </div>
  );
}
