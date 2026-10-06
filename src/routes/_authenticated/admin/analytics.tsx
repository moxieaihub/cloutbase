import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { PaidBadge } from "@/components/PaidBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import type { ExportColumn } from "@/lib/export";
import { exportCsv, exportPdf, slugify } from "@/lib/export";
import { sendCampaignEmail } from "@/lib/email.functions";
import { formatDate } from "@/lib/payout";
import { formatTimestamp, formatViews, snapshotState } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Campaign analytics — Cloutbase admin" },
      {
        name: "description",
        content:
          "Drill from any Cloutbase campaign into its clippers, their clips, per-platform views and earnings.",
      },
      { property: "og:title", content: "Campaign analytics — Cloutbase admin" },
      {
        property: "og:description",
        content: "Views, platform breakdown and payouts for every Cloutbase campaign.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminAnalytics,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading analytics.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  brand_username: string;
  brand_email: string | null;
  budget: number;
  clipper_pool: number;
  per_clipper_ceiling: number;
  rate_per_1000_views: number;
  slots: number;
  slots_taken: number;
  clipper_count: number;
  clip_count: number;
  total_views: number;
  tiktok_views: number;
  ig_views: number;
  youtube_views: number;
  spent: number;
  ends_at: string | null;
  created_at: string;
};

type ClipperRow = {
  clipper_user_id: string;
  username: string;
  real_name: string | null;
  banned: boolean;
  strikes: number;
  clip_count: number;
  total_views: number;
  earnings: number;
  unpaid: number;
  joined_at: string | null;
  first_clip_at: string | null;
  at_risk: boolean;
  released: boolean;
};

type ClipRow = {
  id: string;
  platform: string;
  clip_link: string;
  view_count: number;
  snapshot_view_count: number | null;
  earnings: number;
  paid: boolean;
  paid_at: string | null;
  is_live: boolean;
  deleted_before_snapshot: boolean;
  posted_at: string;
  counts_from: string | null;
  last_checked_at: string | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

const CAMPAIGN_COLUMNS: ExportColumn<CampaignRow>[] = [
  { header: "Campaign", value: (c) => c.title },
  { header: "Brand", value: (c) => c.brand_username },
  { header: "Status", value: (c) => c.status },
  { header: "Budget (NGN)", value: (c) => Number(c.budget) },
  { header: "Clipper pool (NGN)", value: (c) => Number(c.clipper_pool) },
  { header: "Spent (NGN)", value: (c) => Number(c.spent) },
  {
    header: "Pool remaining (NGN)",
    value: (c) => Math.max(Number(c.clipper_pool) - Number(c.spent), 0),
  },
  { header: "Slots taken", value: (c) => `${c.slots_taken}/${c.slots}` },
  { header: "Clippers", value: (c) => c.clipper_count },
  { header: "Clips", value: (c) => c.clip_count },
  { header: "Total views", value: (c) => c.total_views },
  { header: "TikTok views", value: (c) => c.tiktok_views },
  { header: "Instagram views", value: (c) => c.ig_views },
  { header: "YouTube views", value: (c) => c.youtube_views },
  { header: "Ends", value: (c) => (c.ends_at ? formatDate(c.ends_at) : "—") },
];

const CLIPPER_COLUMNS: ExportColumn<ClipperRow>[] = [
  { header: "Clipper", value: (c) => c.username },
  { header: "Clips", value: (c) => c.clip_count },
  { header: "Views", value: (c) => c.total_views },
  { header: "Earnings (NGN)", value: (c) => Number(c.earnings) },
  { header: "Awaiting payout (NGN)", value: (c) => Number(c.unpaid) },
  { header: "Strikes", value: (c) => c.strikes },
  { header: "Joined", value: (c) => (c.joined_at ? formatDate(c.joined_at) : "—") },
  { header: "First clip", value: (c) => (c.first_clip_at ? formatDate(c.first_clip_at) : "—") },
];

async function exportCampaignsPdf(rows: CampaignRow[]) {
  const views = rows.reduce((t, c) => t + Number(c.total_views), 0);
  const spent = rows.reduce((t, c) => t + Number(c.spent), 0);
  await exportPdf(
    `cloutbase-campaigns-${today()}`,
    "Cloutbase — campaign analytics",
    `All campaigns · generated ${formatDate(new Date().toISOString())}`,
    CAMPAIGN_COLUMNS,
    rows,
    [
      { label: "Campaigns", value: String(rows.length) },
      { label: "Verified views", value: formatViews(views) },
      { label: "Paid to clippers", value: formatNaira(spent) },
      {
        label: "Live",
        value: String(rows.filter((c) => c.status === "live").length),
      },
    ],
  );
}

function AdminAnalytics() {
  const [openCampaign, setOpenCampaign] = useState<string | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["admin-campaign-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_campaign_analytics");
      if (error) throw error;
      return (data ?? []) as CampaignRow[];
    },
  });

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Tap a campaign to see its clippers, then a clipper to see their clips.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!(campaigns ?? []).length}
            onClick={() =>
              exportCsv(`cloutbase-campaigns-${today()}`, CAMPAIGN_COLUMNS, campaigns ?? [])
            }
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!(campaigns ?? []).length}
            onClick={() => exportCampaignsPdf(campaigns ?? [])}
          >
            Export PDF
          </Button>
        </div>
      </div>


      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (campaigns ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No campaigns yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(campaigns ?? []).map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              open={openCampaign === c.id}
              onToggle={() => setOpenCampaign(openCampaign === c.id ? null : c.id)}
            />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function CampaignCard({
  campaign,
  open,
  onToggle,
}: {
  campaign: CampaignRow;
  open: boolean;
  onToggle: () => void;
}) {
  const sendEmail = useServerFn(sendCampaignEmail);
  const [openClipper, setOpenClipper] = useState<string | null>(null);

  const { data: clippers } = useQuery({
    enabled: open,
    queryKey: ["admin-campaign-clippers", campaign.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_campaign_clippers", {
        _campaign_id: campaign.id,
      });
      if (error) throw error;
      return (data ?? []) as ClipperRow[];
    },
  });

  const { data: timeline } = useQuery({
    enabled: open,
    queryKey: ["admin-campaign-timeline", campaign.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_campaign_views_over_time", {
        _campaign_id: campaign.id,
      });
      if (error) throw error;
      return (data ?? []) as { day: string; views: number; cumulative_views: number }[];
    },
  });

  const report = useMutation({
    mutationFn: async () => sendEmail({ data: { campaignId: campaign.id, kind: "performance_report" } }),
    onSuccess: (res) =>
      res.sent
        ? toast.success(`Report sent to ${res.to}`)
        : toast.warning(`Report queued — ${res.reason}`),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <li className="rounded-2xl border border-border p-5">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{campaign.title}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {campaign.status.replace("_", " ")} · {campaign.brand_username}
            </p>
          </div>
          <span className="shrink-0 text-sm text-money">{formatNaira(Number(campaign.spent))} paid</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Stat label="Total views" value={formatViews(campaign.total_views)} />
          <Stat label="Clips" value={`${campaign.clip_count} from ${campaign.clipper_count}`} />
          <Stat label="Slots" value={`${campaign.slots_taken}/${campaign.slots}`} />
          <Stat
            label="Pool remaining"
            value={formatNaira(Math.max(Number(campaign.clipper_pool) - Number(campaign.spent), 0))}
            money
          />
          <Stat label="TikTok" value={formatViews(campaign.tiktok_views)} />
          <Stat label="Instagram" value={formatViews(campaign.ig_views)} />
          <Stat label="YouTube" value={formatViews(campaign.youtube_views)} />
          <Stat label="Ends" value={campaign.ends_at ? formatDate(campaign.ends_at) : "—"} />
        </div>
      </button>

      {open ? (
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={report.isPending} onClick={() => report.mutate()}>
              {report.isPending ? "Sending…" : "Send performance report"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!(clippers ?? []).length}
              onClick={() =>
                exportCsv(
                  `cloutbase-${slugify(campaign.title)}-clippers`,
                  CLIPPER_COLUMNS,
                  clippers ?? [],
                )
              }
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!(clippers ?? []).length}
              onClick={() =>
                exportPdf(
                  `cloutbase-${slugify(campaign.title)}-report`,
                  campaign.title,
                  `Cloutbase campaign report for ${campaign.brand_username} · generated ${formatDate(new Date().toISOString())}`,
                  CLIPPER_COLUMNS,
                  clippers ?? [],
                  [
                    { label: "Verified views", value: formatViews(campaign.total_views) },
                    { label: "Clips", value: String(campaign.clip_count) },
                    { label: "Paid out", value: formatNaira(Number(campaign.spent)) },
                    {
                      label: "Pool",
                      value: formatNaira(Number(campaign.clipper_pool)),
                    },
                  ],
                )
              }
            >
              Export PDF
            </Button>
          </div>

          {(timeline ?? []).length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-medium">Accumulated views</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {(timeline ?? []).map((t) => (
                  <li key={t.day} className="flex justify-between">
                    <span>{formatDate(t.day)}</span>
                    <span>
                      +{formatViews(t.views)} · {formatViews(t.cumulative_views)} total
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-6 text-xs font-medium">Clippers</p>
          {(clippers ?? []).length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No clippers in this campaign yet.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {(clippers ?? []).map((cl) => (
                <ClipperCard
                  key={cl.clipper_user_id}
                  campaignId={campaign.id}
                  clipper={cl}
                  open={openClipper === cl.clipper_user_id}
                  onToggle={() =>
                    setOpenClipper(openClipper === cl.clipper_user_id ? null : cl.clipper_user_id)
                  }
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </li>
  );
}

function ClipperCard({
  campaignId,
  clipper,
  open,
  onToggle,
}: {
  campaignId: string;
  clipper: ClipperRow;
  open: boolean;
  onToggle: () => void;
}) {
  const queryClient = useQueryClient();
  const [reference, setReference] = useState("");

  const { data: clips } = useQuery({
    enabled: open,
    queryKey: ["admin-clipper-clips", campaignId, clipper.clipper_user_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_clipper_clips", {
        _campaign_id: campaignId,
        _clipper_user_id: clipper.clipper_user_id,
      });
      if (error) throw error;
      return (data ?? []) as ClipRow[];
    },
  });

  const release = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_release_payout", {
        _clipper_user_id: clipper.clipper_user_id,
        ...(reference.trim() ? { _reference: reference.trim() } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment released");
      setReference("");
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-clippers", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["admin-clipper-clips", campaignId, clipper.clipper_user_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hold = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_hold_payout", {
        _clipper_user_id: clipper.clipper_user_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payout held until Friday");
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-clippers", campaignId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <li className="rounded-xl border border-border p-4">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{clipper.username}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {clipper.clip_count} clips · {formatViews(clipper.total_views)} views
              {clipper.at_risk ? " · at risk" : ""}
              {clipper.banned ? " · banned" : ""}
            </p>
          </div>
          <span className="shrink-0 text-sm text-money">{formatNaira(Number(clipper.earnings))}</span>
        </div>
      </button>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat label="Awaiting payout" value={formatNaira(Number(clipper.unpaid))} money />
            <Stat label="Strikes" value={String(clipper.strikes)} />
            <Stat label="Joined" value={clipper.joined_at ? formatDate(clipper.joined_at) : "—"} />
            <Stat
              label="First clip"
              value={clipper.first_clip_at ? formatDate(clipper.first_clip_at) : "None yet"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Paystack transfer reference"
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs"
            />
            <Button size="sm" disabled={release.isPending} onClick={() => release.mutate()}>
              {release.isPending ? "Releasing…" : "Release Payment"}
            </Button>
            <Button size="sm" variant="outline" disabled={hold.isPending} onClick={() => hold.mutate()}>
              {hold.isPending ? "Holding…" : "Hold until Friday"}
            </Button>
          </div>

          <ul className="space-y-3">
            {(clips ?? []).map((clip) => {
              const state = snapshotState(clip);
              return (
                <li key={clip.id} className="rounded-lg border border-border p-3 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="capitalize">{clip.platform}</span>
                    <span className="flex items-center gap-2 text-money">
                      {formatNaira(Number(clip.earnings))}
                      {clip.paid ? <PaidBadge /> : null}
                    </span>
                  </div>
                  <a
                    href={clip.clip_link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 block break-all underline underline-offset-4"
                  >
                    {clip.clip_link}
                  </a>
                  <p className="mt-2 text-muted-foreground">
                    {formatViews(clip.view_count)} views
                    {clip.snapshot_view_count !== null
                      ? ` · snapshot ${formatViews(clip.snapshot_view_count)}`
                      : ""}{" "}
                    · {state.label}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Last reading {formatTimestamp(clip.last_checked_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function Stat({ label, value, money }: { label: string; value: string; money?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={`mt-1 font-medium ${money ? "text-money" : ""}`}>{value}</p>
    </div>
  );
}
