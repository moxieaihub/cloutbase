import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { PaidBadge } from "@/components/PaidBadge";
import { EarnUpTo } from "@/components/EarnUpTo";
import { CampaignProgress } from "@/components/CampaignProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TermsBox } from "@/components/TermsBox";
import { supabase } from "@/integrations/supabase/client";
import { CAMPAIGN_TERMS, TERMS_VERSION } from "@/lib/terms";
import { formatNaira, isValidVideoLink } from "@/lib/campaign";
import {
  campaignProgress,
  countdown,
  platformLabel,
  PLATFORMS,
  POSTING_RULES,
  RESERVE_BONUS_NOTE,
  slotsLeft,
  type Platform,
} from "@/lib/clipper";
import { earlyAccessCountdown, formatFollowers } from "@/lib/inhouse";
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
        content:
          "Campaign brief: earning ceiling, exact caption, hashtags, brand tag, CTA link and clip submission.",
      },
      { property: "og:title", content: "Campaign brief — Cloutbase" },
      {
        property: "og:description",
        content: "Claim a slot, follow the brief exactly and submit your clips.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CampaignBrief,
  errorComponent: () => <Shell><p className="text-sm text-muted-foreground">Something went wrong loading this campaign.</p></Shell>,
  notFoundComponent: () => <Shell><p className="text-sm text-muted-foreground">Campaign not found.</p></Shell>,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/clipper" className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </Link>
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}

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

function CampaignBrief() {
  const { campaignId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const [clipLink, setClipLink] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [watermarkUrl, setWatermarkUrl] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [watermarkConfirmed, setWatermarkConfirmed] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [working, setWorking] = useState(false);



  const { data: campaign, isLoading } = useQuery({
    queryKey: ["clipper-brief", campaignId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("clipper_campaign_brief", {
        _campaign_id: campaignId,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    refetchInterval: 30_000,
  });

  const { data: myClips } = useQuery({
    queryKey: ["my-clips", campaignId, user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_submissions")
        .select(
          "id, platform, clip_link, view_count, earnings, paid, posted_at, counts_from, is_live, deleted_before_snapshot, snapshot_view_count, snapshot_taken_at, last_checked_at, watermark_verified, watermark_note",
        )
        .eq("campaign_id", campaignId)
        .eq("clipper_user_id", user.id)
        .order("posted_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: myAccounts } = useQuery({
    queryKey: ["clipper-accounts", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clipper_accounts")
        .select("platform")
        .eq("clipper_user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((a) => a.platform as Platform);
    },
  });

  const join = useMutation({
    mutationFn: async () => {
      if (!rulesAccepted) throw new Error("Accept the campaign rules before joining");
      const { error: termsError } = await supabase.from("terms_acceptances").insert({
        user_id: user.id,
        kind: "campaign_rules",
        campaign_id: campaignId,
        version: TERMS_VERSION,
        user_agent: navigator.userAgent,
      });
      if (termsError && !termsError.message.includes("duplicate")) throw termsError;
      const { error } = await supabase.rpc("join_campaign", { _campaign_id: campaignId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot claimed. Post your first clip within 72 hours.");
      queryClient.invalidateQueries({ queryKey: ["clipper-brief", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["clipper-feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!isValidVideoLink(clipLink)) throw new Error("Paste a valid clip link");
      if (!platform) throw new Error("Select a platform");
      const allowed = (campaign?.target_platforms ?? []) as Platform[];
      if (allowed.length > 0 && !allowed.includes(platform))
        throw new Error("This campaign does not run on that platform");
      if (campaign?.is_inhouse && !watermarkConfirmed)
        throw new Error("Confirm the Cloutbase watermark is on this clip");
      const { error } = await supabase.from("clip_submissions").insert({
        campaign_id: campaignId,
        clipper_user_id: user.id,
        platform,
        clip_link: clipLink.trim(),
        watermark_confirmed: campaign?.is_inhouse ? watermarkConfirmed : true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setClipLink("");
      setPlatform("");
      setWatermarkConfirmed(false);
      toast.success("Clip submitted. It counts once it stays live 5 days.");
      queryClient.invalidateQueries({ queryKey: ["my-clips", campaignId, user.id] });
      queryClient.invalidateQueries({ queryKey: ["clipper-brief", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["clipper-feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


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



  if (isLoading) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  if (!campaign) return <Shell><p className="text-sm text-muted-foreground">Campaign not available.</p></Shell>;

  const left = slotsLeft(campaign.slots, campaign.slots_taken);
  const full = left === 0;
  const targetPlatforms = ((campaign.target_platforms ?? []) as Platform[]).filter(Boolean);
  const platformOptions = PLATFORMS.filter(
    (p) => targetPlatforms.length === 0 || targetPlatforms.includes(p.value),
  );
  const linkedOptions = platformOptions.filter((p) => (myAccounts ?? []).includes(p.value));
  const closed =
    campaign.status !== "live" ||
    (campaign.ends_at ? new Date(campaign.ends_at).getTime() <= Date.now() : false);
  const canSubmit = !closed && linkedOptions.length > 0;
  const needsAccountNote =
    linkedOptions.length === 0 && platformOptions.length > 0
      ? `This campaign needs ${platformOptions.map((p) => p.label).join(" or ")} — link a ${platformOptions[0]!.label} account to join`
      : null;
  const earned = (myClips ?? []).reduce((s, c) => s + Number(c.earnings ?? 0), 0);

  const early = campaign.can_join ? null : earlyAccessCountdown(campaign.early_access_until);

  return (
    <Shell>
      {campaign.is_inhouse ? (
        <span className="mb-3 inline-block rounded-full border border-foreground px-2 py-0.5 text-[11px] font-medium">
          In-house · Official Clippers
        </span>
      ) : null}
      <EarnUpTo
        ceiling={Number(campaign.per_clipper_ceiling)}
        ratePer1000={Number(campaign.rate_per_1000_views)}
      />
      <h1 className="mt-3 text-xl font-semibold tracking-tight">{campaign.title}</h1>
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

      {campaign.joined ? (
        <p className="mt-5 rounded-xl border border-border px-4 py-3 text-sm">
          You hold a slot on this campaign.
        </p>
      ) : (
        <>
          <div className="mt-5">
            <TermsBox
              title="Before you join"
              points={CAMPAIGN_TERMS}
              checked={rulesAccepted}
              onChange={setRulesAccepted}
              label="I accept these campaign rules."
            />
          </div>
          <Button
            className="mt-4 w-full"
            disabled={
              full || closed || join.isPending || !campaign.can_join || !rulesAccepted
            }
            onClick={() => join.mutate()}
          >
            {closed
              ? "Campaign closed"
              : full
              ? "Slots full"
              : !campaign.can_join
                ? "Not open to you yet"
                : !rulesAccepted
                  ? "Accept the rules to join"
                  : join.isPending
                  ? "Joining…"
                  : "Join Campaign"}
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
              {campaign.is_inhouse
                ? `In-house campaigns need Official Clipper approval and ${formatFollowers(campaign.min_followers)}+ followers.`
                : (early ?? "Official Clippers get first access to these slots.")}{" "}
              <Link to="/become-a-clipper" className="underline underline-offset-4">
                Become an Official Clipper
              </Link>
            </p>
          ) : null}
        </>
      )}

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

      {campaign.is_inhouse ? (
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
                  <img
                    src={preview}
                    alt="Watermarked preview"
                    className="rounded-lg border border-border"
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ) : null}



      {campaign.joined ? (
        <section className="mt-10">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Submit a clip
          </h2>
          {needsAccountNote ? (
            <div className="mt-3 rounded-2xl border border-border p-4 text-sm leading-relaxed">
              {needsAccountNote}.{" "}
              <Link to="/clipper/profile" className="underline underline-offset-4">
                Link an account
              </Link>
            </div>
          ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit.mutate();
            }}
          >
            <div>
              <Label htmlFor="clip">Clip link</Label>
              <Input
                id="clip"
                value={clipLink}
                onChange={(e) => setClipLink(e.target.value)}
                placeholder="https://tiktok.com/@you/video/…"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger id="platform" className="mt-1">
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {linkedOptions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {campaign.is_inhouse ? (
              <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-xs leading-relaxed">
                <input
                  type="checkbox"
                  checked={watermarkConfirmed}
                  onChange={(e) => setWatermarkConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  The Cloutbase watermark is on this clip, bottom-right, visible the whole way
                  through. Admin verifies it — a clip without it earns nothing.
                </span>
              </label>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={
                submit.isPending ||
                !canSubmit ||
                (campaign.is_inhouse && (!watermarkConfirmed || !campaign.cloutbase_watermark_url))
              }
            >
              {closed
                ? "Campaign closed"
                : submit.isPending
                  ? "Submitting…"
                  : "Submit clip"}
            </Button>

          </form>
          )}

          <div className="mt-6 rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Earned on this campaign</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-money">
              {formatNaira(earned)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              of {formatNaira(Number(campaign.per_clipper_ceiling))} ceiling
            </p>
          </div>

          {myClips && myClips.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {myClips.map((c) => (
                <li key={c.id} className="rounded-xl border border-border p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{c.platform}</span>
                    <span className="flex items-center gap-2 text-money">
                      {formatNaira(Number(c.earnings ?? 0))}
                      {c.paid ? <PaidBadge /> : null}
                    </span>
                  </div>
                  {campaign.is_inhouse ? (
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
                    {formatViews(c.snapshot_view_count ?? c.view_count)} views ·{" "}
                    {snapshotState(c).label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Last reading: {formatTimestamp(c.last_checked_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <p className="mt-8 text-xs text-muted-foreground">
          Only clippers who joined this campaign can submit clips.
        </p>
      )}
    </Shell>
  );
}
