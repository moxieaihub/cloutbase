import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { CampaignProgress } from "@/components/CampaignProgress";
import { EarnUpTo } from "@/components/EarnUpTo";
import { PaidBadge } from "@/components/PaidBadge";
import { TermsBox } from "@/components/TermsBox";
import { Button } from "@/components/ui/button";
import { ClipperShell } from "@/features/clipper/components/ClipperShell";
import {
  useApplyForSlot,
  useCampaignBrief,
  useMyAccounts,
  useMyApplication,
  useMyCampaignClips,
} from "@/features/clipper/queries";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import {
  campaignProgress,
  countdown,
  platformLabel,
  POSTING_RULES,
  RESERVE_BONUS_NOTE,
  slotsLeft,
  type Platform,
} from "@/lib/clipper";
import { earlyAccessCountdown, formatFollowers } from "@/lib/inhouse";
import { CAMPAIGN_TERMS } from "@/lib/terms";
import { formatTimestamp, formatViews, snapshotState } from "@/lib/views";
import {
  applyToImage,
  buildOverlayPng,
  downloadBlob,
  watermarkStateLabel,
  WATERMARK_PLACEMENT,
} from "@/lib/watermark";

export const Route = createFileRoute("/_authenticated/clipper/campaign/$campaignId")({
  head: () => ({
    meta: [
      { title: "Campaign brief — Cloutbase" },
      {
        name: "description",
        content: "Campaign brief: earning ceiling, caption, hashtags, brand tag, CTA link and clip submission.",
      },
    ],
  }),
  component: CampaignBriefPage,
  errorComponent: () => (
    <ClipperShell hideTabs>
      <p className="text-sm text-muted-foreground">Something went wrong loading this campaign.</p>
    </ClipperShell>
  ),
  notFoundComponent: () => (
    <ClipperShell hideTabs>
      <p className="text-sm text-muted-foreground">Campaign not found.</p>
    </ClipperShell>
  ),
});

function CopyField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success(`${label} copied`);
          }}
          className="text-xs underline underline-offset-4"
        >
          Copy
        </button>
      </div>
      <p className="mt-2 break-words text-sm">{value}</p>
    </div>
  );
}

function CampaignBriefPage() {
  const { campaignId } = Route.useParams();
  const { user } = Route.useRouteContext();

  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const { data: campaign, isLoading } = useCampaignBrief(campaignId);
  const { data: myClips } = useMyCampaignClips(campaignId, user.id);
  const { data: myAccounts } = useMyAccounts(user.id);
  const { data: application } = useMyApplication(campaignId, user.id);

  const apply = useApplyForSlot(campaignId, user.id);

  const cloutbaseWatermark = campaign?.cloutbase_watermark_url ?? null;
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!cloutbaseWatermark) {
        setWatermarkUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("campaign-assets")
        .createSignedUrl(cloutbaseWatermark, 3600);
      if (!cancelled) setWatermarkUrl(data?.signedUrl ?? null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [cloutbaseWatermark]);

  if (isLoading) {
    return (
      <ClipperShell hideTabs>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </ClipperShell>
    );
  }
  if (!campaign) {
    return (
      <ClipperShell hideTabs>
        <p className="text-sm text-muted-foreground">Campaign not available.</p>
      </ClipperShell>
    );
  }

  const left = slotsLeft(campaign.slots, campaign.slots_taken);
  const full = left === 0;
  const targetPlatforms = ((campaign.target_platforms ?? []) as Platform[]).filter(Boolean);
  const usableAccounts = (myAccounts ?? []).filter(
    (a) => targetPlatforms.length === 0 || targetPlatforms.includes(a.platform),
  );
  // "full" = roster full but still running; only ended/expired campaigns are closed.
  const closed =
    (campaign.status !== "live" && campaign.status !== "full") ||
    (campaign.ends_at ? new Date(campaign.ends_at).getTime() <= Date.now() : false);
  const needsAccountNote =
    usableAccounts.length === 0
      ? targetPlatforms.length > 0
        ? `This campaign needs ${targetPlatforms.map(platformLabel).join(" or ")} — link an account first`
        : "Link an account first"
      : null;
  const earned = (myClips ?? []).reduce((s, c) => s + Number(c.earnings ?? 0), 0);
  const early = campaign.can_join ? null : earlyAccessCountdown(campaign.early_access_until);
  const isInhouse = Boolean(campaign.is_inhouse);

  const applyLabel = closed
    ? "Campaign closed"
    : full
      ? "Slots full"
      : !campaign.can_join
        ? "Not open to you yet"
        : !rulesAccepted
          ? "Accept the rules to apply"
          : apply.isPending
            ? "Sending…"
            : "Apply for a slot";

  return (
    <ClipperShell hideTabs>
      <Link to="/clipper" className="text-sm text-muted-foreground hover:text-foreground">
        ← Campaigns
      </Link>

      <div className="mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
        {/* LEFT: the brief */}
        <div>
          {isInhouse ? (
            <span className="mb-3 inline-block rounded-full border border-foreground px-2 py-0.5 text-[11px] font-medium">
              In-house · Official Clippers
            </span>
          ) : null}
          <EarnUpTo
            ceiling={Number(campaign.per_clipper_ceiling)}
            ratePer1000={Number(campaign.rate_per_1000_views)}
          />
          <h1 className="mt-3 text-xl font-semibold tracking-tight md:text-2xl">{campaign.title}</h1>

          {targetPlatforms.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {targetPlatforms.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {platformLabel(p)}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>{full ? "Slots full" : `${left} of ${campaign.slots} slots left`}</span>
            <span>{countdown(campaign.ends_at)}</span>
          </div>
          <CampaignProgress
            className="mt-4"
            percent={campaignProgress(campaign.spent, campaign.clipper_pool)}
          />

          <div className="mt-4 rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">KPI target</p>
            <p className="mt-1 text-sm">{campaign.kpi_target ?? "General Reach"}</p>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{POSTING_RULES}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{RESERVE_BONUS_NOTE}</p>

          <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Paste this exactly
          </h2>
          <div className="mt-3 space-y-3">
            <CopyField label="Caption" value={campaign.caption} />
            <CopyField label="Hashtags" value={campaign.hashtags} />
            <CopyField label="Brand tag" value={campaign.brand_tag} />
            <CopyField label="CTA link" value={campaign.cta_link} />
            <CopyField label="Watermark" value={campaign.watermark_url} />
            <CopyField label="Source file" value={campaign.source_file_link} />
          </div>

          {isInhouse ? (
            <div className="mt-3 rounded-xl border border-foreground p-4 text-xs leading-relaxed">
              <p className="font-medium">Cloutbase watermark required</p>
              <p className="mt-1 text-muted-foreground">
                {campaign.cloutbase_watermark_url
                  ? "Every in-house clip must carry the Cloutbase watermark supplied by admin."
                  : "Admin hasn't uploaded the Cloutbase watermark yet — check back before posting."}
              </p>
              <p className="mt-2 text-muted-foreground">{WATERMARK_PLACEMENT}</p>
              {watermarkUrl ? (
                <>
                  <img
                    src={watermarkUrl}
                    alt="Cloutbase watermark"
                    className="mt-3 h-16 w-auto rounded-lg border border-border bg-secondary object-contain p-2"
                  />
                  <div className="mt-3 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={working}
                      onClick={async () => {
                        try {
                          setWorking(true);
                          downloadBlob(
                            await buildOverlayPng(watermarkUrl),
                            "cloutbase-watermark-overlay-1080x1920.png",
                          );
                        } catch (e) {
                          toast.error((e as Error).message);
                        } finally {
                          setWorking(false);
                        }
                      }}
                    >
                      Download ready-placed overlay (1080×1920)
                    </Button>
                    <label className="cursor-pointer rounded-lg border border-dashed border-border px-3 py-2 text-center text-[11px] text-muted-foreground hover:border-foreground">
                      Check placement — upload a frame and we apply it for you
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          try {
                            setWorking(true);
                            const out = await applyToImage(file, watermarkUrl);
                            setPreview(URL.createObjectURL(out));
                            downloadBlob(out, "cloutbase-watermarked-frame.png");
                          } catch (err) {
                            toast.error((err as Error).message);
                          } finally {
                            setWorking(false);
                          }
                        }}
                      />
                    </label>
                    {preview ? (
                      <img src={preview} alt="Watermarked preview" className="rounded-lg border border-border" />
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* RIGHT: apply / submit / my clips */}
        <div className="mt-10 lg:mt-0">
          {campaign.joined ? (
            <section>
              <p className="rounded-xl border border-border px-4 py-3 text-sm">
                You hold a slot on this campaign.
              </p>

              <div className="mt-6 rounded-2xl border border-border p-5">
                <h2 className="text-sm font-medium">Posted your clip?</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Submit the link to your live post so it can start counting.
                </p>
                {closed ? (
                  <Button className="mt-4 w-full" disabled>
                    Campaign closed
                  </Button>
                ) : (
                  <Button asChild className="mt-4 w-full">
                    <Link to="/clipper/submit/$campaignId" params={{ campaignId }}>
                      Submit a clip
                    </Link>
                  </Button>
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-border p-5">
                <p className="text-sm text-muted-foreground">Earned on this campaign</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-money">{formatNaira(earned)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  of {formatNaira(Number(campaign.per_clipper_ceiling))} ceiling
                </p>
              </div>

              {myClips && myClips.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {myClips.map((c) => (
                    <li key={c.id} className="rounded-xl border border-border p-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{platformLabel(c.platform)}</span>
                        <span className="flex items-center gap-2 text-money">
                          {formatNaira(Number(c.earnings ?? 0))}
                          {c.paid ? <PaidBadge /> : null}
                        </span>
                      </div>
                      {isInhouse ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {watermarkStateLabel(c.watermark_verified ?? null).label}
                          {c.watermark_note ? ` · ${c.watermark_note}` : ""}
                        </p>
                      ) : null}
                      <a
                        href={c.clip_link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 block truncate text-xs text-muted-foreground underline underline-offset-4"
                      >
                        {c.clip_link}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatViews(c.snapshot_view_count ?? c.view_count)} views · {snapshotState(c).label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last reading: {formatTimestamp(c.last_checked_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : application?.status === "applied" ? (
            <p className="rounded-xl border border-[#4DA3FF]/40 px-4 py-3 text-sm text-[#4DA3FF]">
              Application sent. Admin will review it and you’ll get a notification.
            </p>
          ) : application?.status === "declined" ? (
            <p className="rounded-xl border border-border px-4 py-3 text-sm">
              Not accepted.
              {application.decline_reason ? ` Reason: ${application.decline_reason}` : ""}
            </p>
          ) : (
            <>
              <TermsBox
                title="Before you apply"
                points={CAMPAIGN_TERMS}
                checked={rulesAccepted}
                onChange={setRulesAccepted}
                label="I accept these campaign rules."
              />
              <Button
                className="mt-4 w-full"
                disabled={
                  full ||
                  closed ||
                  apply.isPending ||
                  !campaign.can_join ||
                  !rulesAccepted ||
                  Boolean(needsAccountNote)
                }
                onClick={() => apply.mutate()}
              >
                {applyLabel}
              </Button>
              {needsAccountNote ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {needsAccountNote}.{" "}
                  <Link to="/clipper/profile" className="underline underline-offset-4">
                    Link an account
                  </Link>
                </p>
              ) : null}
              {!campaign.can_join ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {isInhouse
                    ? `In-house campaigns need Official Clipper approval and ${formatFollowers(campaign.min_followers)}+ followers.`
                    : (early ?? "Official Clippers get first access to these slots.")}{" "}
                  <Link to="/become-a-clipper" className="underline underline-offset-4">
                    Become an Official Clipper
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </ClipperShell>
  );
}
