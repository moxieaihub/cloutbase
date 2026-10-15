import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PaidBadge } from "@/components/PaidBadge";
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
import { ClipperShell } from "@/features/clipper/components/ClipperShell";
import {
  useCampaignBrief,
  useMyAccounts,
  useMyCampaignClips,
  useSubmitClip,
} from "@/features/clipper/queries";
import { formatNaira } from "@/lib/campaign";
import { countdown, platformLabel, POSTING_RULES, type Platform } from "@/lib/clipper";
import { formatViews, snapshotState } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/clipper/submit/$campaignId")({
  head: () => ({
    meta: [
      { title: "Submit a clip — Cloutbase" },
      {
        name: "description",
        content: "Submit your posted clip link for a campaign you hold a slot on.",
      },
    ],
  }),
  component: SubmitClipPage,
  errorComponent: () => (
    <ClipperShell hideTabs>
      <p className="text-sm text-muted-foreground">Something went wrong loading this page.</p>
    </ClipperShell>
  ),
  notFoundComponent: () => (
    <ClipperShell hideTabs>
      <p className="text-sm text-muted-foreground">Campaign not found.</p>
    </ClipperShell>
  ),
});

const STEPS = [
  "Post the clip on your own account using the exact caption, hashtags and tags from the brief.",
  "Copy the link to the live post.",
  "Paste it below and pick the account you posted from.",
];

function SubmitClipPage() {
  const { campaignId } = Route.useParams();
  const { user } = Route.useRouteContext();

  const [clipLink, setClipLink] = useState("");
  const [accountId, setAccountId] = useState("");
  const [watermarkConfirmed, setWatermarkConfirmed] = useState(false);

  const { data: campaign, isLoading } = useCampaignBrief(campaignId);
  const { data: myClips } = useMyCampaignClips(campaignId, user.id);
  const { data: myAccounts } = useMyAccounts(user.id);

  const submit = useSubmitClip(campaignId, user.id, () => {
    setClipLink("");
    setAccountId("");
    setWatermarkConfirmed(false);
  });

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

  const targetPlatforms = ((campaign.target_platforms ?? []) as Platform[]).filter(Boolean);
  const usableAccounts = (myAccounts ?? []).filter(
    (a) => targetPlatforms.length === 0 || targetPlatforms.includes(a.platform),
  );
  const selectedAccount = usableAccounts.find((a) => a.id === accountId);
  const isInhouse = Boolean(campaign.is_inhouse);

  // A campaign whose roster is full ("full") is still running: clippers who hold a
  // slot must be able to keep submitting. Only ended / expired campaigns are closed.
  const closed =
    (campaign.status !== "live" && campaign.status !== "full") ||
    (campaign.ends_at ? new Date(campaign.ends_at).getTime() <= Date.now() : false);

  const needsAccountNote =
    usableAccounts.length === 0
      ? targetPlatforms.length > 0
        ? `This campaign needs ${targetPlatforms.map(platformLabel).join(" or ")} — link an account first`
        : "Link an account first"
      : null;

  const canSubmit =
    !closed &&
    !submit.isPending &&
    Boolean(selectedAccount) &&
    clipLink.trim().length > 0 &&
    (!isInhouse || (watermarkConfirmed && Boolean(campaign.cloutbase_watermark_url)));

  const earned = (myClips ?? []).reduce((s, c) => s + Number(c.earnings ?? 0), 0);

  return (
    <ClipperShell hideTabs>
      <Link
        to="/clipper/campaign/$campaignId"
        params={{ campaignId }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Campaign brief
      </Link>

      <div className="mt-6 lg:grid lg:grid-cols-5 lg:items-start lg:gap-10">
        {/* LEFT: submit form */}
        <div className="lg:col-span-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Submit a clip
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">{campaign.title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {targetPlatforms.map((p) => (
              <span
                key={p}
                className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {platformLabel(p)}
              </span>
            ))}
            <span className="text-xs text-muted-foreground">{countdown(campaign.ends_at)}</span>
          </div>

          {!campaign.joined ? (
            <div className="mt-6 rounded-2xl border border-border p-5 text-sm leading-relaxed">
              You need an accepted slot on this campaign before you can submit clips.{" "}
              <Link
                to="/clipper/campaign/$campaignId"
                params={{ campaignId }}
                className="underline underline-offset-4"
              >
                Go to the brief
              </Link>
            </div>
          ) : (
            <>
              <ol className="mt-6 space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border text-[11px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ol>

              {needsAccountNote ? (
                <div className="mt-6 rounded-2xl border border-border p-4 text-sm leading-relaxed">
                  {needsAccountNote}.{" "}
                  <Link to="/clipper/profile" className="underline underline-offset-4">
                    Link an account
                  </Link>
                </div>
              ) : (
                <form
                  className="mt-6 space-y-4 rounded-2xl border border-border p-5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!selectedAccount) return;
                    submit.mutate({
                      clipLink,
                      account: selectedAccount,
                      allowedPlatforms: targetPlatforms,
                      isInhouse,
                      watermarkConfirmed,
                    });
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
                    <Label htmlFor="account">Posted from</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger id="account" className="mt-1">
                        <SelectValue placeholder="Pick the account you posted on" />
                      </SelectTrigger>
                      <SelectContent>
                        {usableAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {platformLabel(a.platform)} · @{a.handle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isInhouse ? (
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
                  <Button type="submit" className="w-full" disabled={!canSubmit}>
                    {closed ? "Campaign closed" : submit.isPending ? "Submitting…" : "Submit clip"}
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">{POSTING_RULES}</p>
                </form>
              )}
            </>
          )}
        </div>

        {/* RIGHT: what I've submitted */}
        <div className="mt-10 lg:col-span-2 lg:mt-0">
          <div className="rounded-2xl border border-border p-5">
            <p className="text-sm text-muted-foreground">Earned on this campaign</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-money">
              {formatNaira(earned)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              of {formatNaira(Number(campaign.per_clipper_ceiling))} ceiling
            </p>
          </div>

          <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Your submissions
          </h2>
          {myClips && myClips.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {myClips.map((c) => (
                <li key={c.id} className="rounded-xl border border-border p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{platformLabel(c.platform)}</span>
                    <span className="flex items-center gap-2 text-money">
                      {formatNaira(Number(c.earnings ?? 0))}
                      {c.paid ? <PaidBadge /> : null}
                    </span>
                  </div>
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
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nothing submitted yet.
            </p>
          )}
        </div>
      </div>
    </ClipperShell>
  );
}
