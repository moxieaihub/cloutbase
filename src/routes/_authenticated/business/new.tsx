import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_RATE_PER_1000_VIEWS,
  slotsForBudget,
  KPI_TARGETS,
  MAX_BUDGET,
  MIN_BUDGET,
  TIERS,
  endsAt,
  estimate,
  formatCompact,
  formatNaira,
  isValidVideoLink,
} from "@/lib/campaign";
import { PLATFORMS, type Platform } from "@/lib/clipper";

export const Route = createFileRoute("/_authenticated/business/new")({
  head: () => ({
    meta: [
      { title: "New campaign — Cloutbase" },
      {
        name: "description",
        content:
          "Create a Cloutbase clipping campaign: paste your source video, set a Naira budget and duration, and see live view estimates.",
      },
      { property: "og:title", content: "New campaign — Cloutbase" },
      {
        property: "og:description",
        content: "Set your budget in Naira and see estimated views before you fund.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewCampaign,
});

const field =
  "mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground";
const labelCls = "text-sm font-medium";

function NewCampaign() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [videoLength, setVideoLength] = useState("");

  const [tierId, setTierId] = useState<string>("entry");
  const [budget, setBudget] = useState<number>(TIERS[0]!.budget);
  const [durationDays, setDurationDays] = useState<number>(TIERS[0]!.durationDays);

  const [kpiTarget, setKpiTarget] = useState<string>(KPI_TARGETS[0]);
  const [targetPlatforms, setTargetPlatforms] = useState<Platform[]>([
    "tiktok",
    "ig",
    "youtube",
  ]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [brandTag, setBrandTag] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [watermark, setWatermark] = useState<File | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const est = useMemo(() => estimate(budget, DEFAULT_RATE_PER_1000_VIEWS), [budget]);
  const campaignSlots = useMemo(() => slotsForBudget(budget), [budget]);
  const platformSentence = useMemo(() => {
    const names = PLATFORMS.filter((p) => targetPlatforms.includes(p.value)).map((p) => p.label);
    if (names.length === 0) return "the platforms you pick";
    if (names.length === 1) return names[0]!;
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  }, [targetPlatforms]);

  function togglePlatform(value: Platform) {
    setTargetPlatforms((current) =>
      current.includes(value) ? current.filter((p) => p !== value) : [...current, value],
    );
  }

  function pickTier(id: string) {
    const tier = TIERS.find((t) => t.id === id);
    if (!tier) return;
    setTierId(id);
    setBudget(tier.budget);
    setDurationDays(tier.durationDays);
  }

  function validate(): string | null {
    if (!title.trim()) return "Give your campaign a title.";
    if (!isValidVideoLink(sourceLink)) return "Paste a valid Google Drive or direct video link.";
    const len = Number(videoLength);
    if (!Number.isFinite(len) || len <= 0) return "Enter the video length in minutes.";
    if (!Number.isFinite(budget) || budget < MIN_BUDGET)
      return `Minimum budget is ${formatNaira(MIN_BUDGET)}.`;
    if (!Number.isFinite(durationDays) || durationDays < 1)
      return "A deadline is required — set the campaign duration in days.";
    if (targetPlatforms.length === 0) return "Pick at least one platform.";
    if (!caption.trim()) return "The exact caption clippers must use is required.";
    if (!hashtags.trim()) return "Hashtags are required.";
    if (!brandTag.trim()) return "A brand tag / mention is required.";
    if (!isValidVideoLink(ctaLink)) return "A valid CTA link is required.";
    return null;
  }


  async function fundWithPaystack() {
    setError(null);
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    try {
      let watermarkPath: string | null = null;
      if (watermark) {
        const ext = watermark.name.split(".").pop() ?? "png";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("campaign-assets")
          .upload(path, watermark, { upsert: false });
        if (upErr) throw upErr;
        watermarkPath = path;
      }

      // Paystack is not wired up yet — this stands in for a successful payment.
      const { data, error: insertErr } = await supabase
        .from("campaigns")
        .insert({
          brand_user_id: user.id,
          title: title.trim(),
          source_file_link: sourceLink.trim(),
          video_length_minutes: Number(videoLength),
          budget,
          commission_amount: est.commission,
          reserve_amount: est.reserve,
          clipper_pool: est.clipperPool,
          slots: campaignSlots,
          per_clipper_ceiling: est.clipperPool / campaignSlots,
          rate_per_1000_views: DEFAULT_RATE_PER_1000_VIEWS,
          kpi_target: kpiTarget,
          target_platforms: targetPlatforms,
          caption: caption.trim(),
          hashtags: hashtags.trim(),
          brand_tag: brandTag.trim(),
          cta_link: ctaLink.trim(),
          watermark_url: watermarkPath,
          duration_days: durationDays,
          ends_at: endsAt(durationDays),
          status: "pending_review" as const,
          funded: true,
        })
        .select("id")
        .single();
      if (insertErr || !data) throw insertErr ?? new Error("Could not create campaign.");

      navigate({ to: "/business" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link
          to="/business"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Cancel
        </Link>
      </header>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">New campaign</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Clippers cut your video and post it. You fund it, we review it, then it goes live.
      </p>

      {/* 1. Source video */}
      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Source video
        </h2>
        <label className="mt-4 block">
          <span className={labelCls}>Campaign title</span>
          <input
            className={field}
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Podcast Ep. 12 clips"
          />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Google Drive or direct video link</span>
          <input
            className={field}
            value={sourceLink}
            maxLength={500}
            onChange={(e) => setSourceLink(e.target.value)}
            placeholder="https://drive.google.com/file/d/…"
          />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Video length (minutes)</span>
          <input
            className={field}
            value={videoLength}
            inputMode="decimal"
            onChange={(e) => setVideoLength(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="45"
          />
        </label>
      </section>

      {/* 2. Budget + duration */}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Budget &amp; duration
        </h2>
        <div className="mt-4 grid gap-3">
          {TIERS.map((tier) => {
            const active = tierId === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => pickTier(tier.id)}
                className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                  active ? "border-foreground bg-foreground text-background" : "border-border"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{tier.name}</span>
                  <span
                    className={`block text-xs ${active ? "opacity-70" : "text-muted-foreground"}`}
                  >
                    {tier.blurb}
                  </span>
                </span>
                <span className="text-sm font-semibold">
                  {formatNaira(tier.budget)}
                  {tier.id === "scale" ? "+" : ""}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setTierId("custom")}
            className={`rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition ${
              tierId === "custom" ? "border-foreground bg-foreground text-background" : "border-border"
            }`}
          >
            Custom budget
            <span
              className={`mt-0.5 block text-xs font-normal ${
                tierId === "custom" ? "opacity-70" : "text-muted-foreground"
              }`}
            >
              Minimum {formatNaira(MIN_BUDGET)}
            </span>
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <span className={labelCls}>Budget</span>
            <span className="text-lg font-semibold tracking-tight text-money">
              {formatNaira(budget)}
            </span>
          </div>
          <input
            type="range"
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={25_000}
            value={Math.min(Math.max(budget, MIN_BUDGET), MAX_BUDGET)}
            onChange={(e) => {
              setTierId("custom");
              setBudget(Number(e.target.value));
            }}
            className="mt-3 w-full accent-foreground"
          />
          <input
            className={field}
            value={budget}
            inputMode="numeric"
            onChange={(e) => {
              setTierId("custom");
              setBudget(Number(e.target.value.replace(/[^\d]/g, "")) || 0);
            }}
          />
          {budget < MIN_BUDGET && (
            <p className="mt-2 text-xs text-destructive">
              Minimum budget is {formatNaira(MIN_BUDGET)}.
            </p>
          )}
        </div>

        <label className="mt-6 block">
          <span className={labelCls}>Duration (days) — deadline required</span>
          <input
            className={field}
            value={durationDays}
            inputMode="numeric"
            onChange={(e) => setDurationDays(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
          />
          <span className="mt-2 block text-xs text-muted-foreground">
            Ends{" "}
            {durationDays > 0
              ? new Date(endsAt(durationDays)).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}
          </span>
        </label>
      </section>

      {/* 3. Live estimator */}
      <section className="mt-8 rounded-2xl border border-border p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          What you get
        </h2>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-money">
          {formatCompact(est.viewsLow)} – {formatCompact(est.viewsHigh)}
        </p>
        <p className="text-sm text-muted-foreground">estimated verified views (±20%)</p>
        <p className="mt-3 text-sm leading-relaxed">
          For {formatNaira(budget)}, you&rsquo;ll receive an estimated{" "}
          {formatCompact(est.viewsLow)}–{formatCompact(est.viewsHigh)} verified views across{" "}
          {platformSentence}.
        </p>

        <dl className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Rate</dt>
            <dd className="font-medium">
              {formatNaira(DEFAULT_RATE_PER_1000_VIEWS)} / 1,000 views
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Clippers on it</dt>
            <dd className="font-medium">{campaignSlots} clippers</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="font-medium">{durationDays || 0} days</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Cloutbase retains a service commission from each campaign.
        </p>
      </section>

      {/* 4. Platforms + KPI */}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Platforms &amp; goal
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Clips can only be posted on the platforms you pick.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {PLATFORMS.map((p) => {
            const active = targetPlatforms.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                  active ? "border-foreground bg-foreground text-background" : "border-border"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <label className="mt-6 block">
          <span className={labelCls}>KPI target</span>
          <select className={field} value={kpiTarget} onChange={(e) => setKpiTarget(e.target.value)}>
            {KPI_TARGETS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
      </section>


      {/* 5. Required assets */}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Required assets
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Every clipper must use these exactly as written.
        </p>
        <label className="mt-4 block">
          <span className={labelCls}>Exact caption</span>
          <textarea
            className={`${field} min-h-24`}
            value={caption}
            maxLength={1000}
            onChange={(e) => setCaption(e.target.value)}
          />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Hashtags</span>
          <input
            className={field}
            value={hashtags}
            maxLength={300}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#cloutbase #naija"
          />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Brand tag / mention</span>
          <input
            className={field}
            value={brandTag}
            maxLength={100}
            onChange={(e) => setBrandTag(e.target.value)}
            placeholder="@yourbrand"
          />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>CTA link</span>
          <input
            className={field}
            value={ctaLink}
            maxLength={500}
            onChange={(e) => setCtaLink(e.target.value)}
            placeholder="https://yourbrand.com/signup"
          />
        </label>
        <div className="mt-4">
          <span className={labelCls}>
            Watermark image <span className="text-muted-foreground">(optional)</span>
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => setWatermark(e.target.files?.[0] ?? null)}
            className="mt-2 w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:text-foreground"
          />
        </div>
      </section>

      {error && (
        <p className="mt-6 rounded-xl border border-destructive/40 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* 6. Fund */}
      <button
        type="button"
        onClick={fundWithPaystack}
        disabled={submitting}
        className="mt-8 w-full rounded-xl bg-money px-4 py-4 text-sm font-semibold text-money-foreground disabled:opacity-60"
      >
        {submitting ? "Processing…" : `Fund campaign — ${formatNaira(budget)}`}
      </button>
      <p className="mt-3 mb-6 text-center text-xs text-muted-foreground">
        Payment provider is being finalised. Funding submits your campaign for review — Cloutbase sets it live once payment is confirmed.
      </p>
    </main>
  );
}
