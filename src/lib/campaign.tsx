import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import {
  KPI_TARGETS,
  PACKAGES,
  endsAt,
  formatCompact,
  formatNaira,
  isValidVideoLink,
  packageById,
  type PackageId,
} from "@/lib/campaign";
import { PLATFORMS, type Platform } from "@/lib/clipper";

export const Route = createFileRoute("/_authenticated/business/new")({
  head: () => ({
    meta: [
      { title: "New campaign — Cloutbase" },
      {
        name: "description",
        content:
          "Create a Cloutbase clipping campaign: paste your source video, pick a package with guaranteed views and a fixed price.",
      },
      { property: "og:title", content: "New campaign — Cloutbase" },
      {
        property: "og:description",
        content: "Pick a package with guaranteed views and a fixed price.",
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

  const [packageId, setPackageId] = useState<PackageId>("starter");
  const pkg = packageById(packageId);

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

  function validate(): string | null {
    if (!title.trim()) return "Give your campaign a title.";
    if (!isValidVideoLink(sourceLink)) return "Paste a valid Google Drive or direct video link.";
    const len = Number(videoLength);
    if (!Number.isFinite(len) || len <= 0) return "Enter the video length in minutes.";
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
          package_id: pkg.id,
          budget: pkg.price,
          duration_days: pkg.durationDays,
          kpi_target: kpiTarget,
          target_platforms: targetPlatforms,
          caption: caption.trim(),
          hashtags: hashtags.trim(),
          brand_tag: brandTag.trim(),
          cta_link: ctaLink.trim(),
          watermark_url: watermarkPath,
          ends_at: endsAt(pkg.durationDays),
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

      {/* 2. Package */}
      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Choose a package
        </h2>
        <div className="mt-4 grid gap-3">
          {PACKAGES.map((p) => {
            const active = packageId === p.id;
            const sub = active ? "opacity-70" : "text-muted-foreground";
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPackageId(p.id)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  active ? "border-foreground bg-foreground text-background" : "border-border"
                }`}
              >
                <span className="block text-2xl font-semibold tracking-tight">
                  {formatCompact(p.guaranteedViews)} views
                </span>
                <span className={`block text-xs ${sub}`}>guaranteed · {p.name}</span>
                <span className="mt-2 block text-sm font-semibold">{formatNaira(p.price)}</span>
                <span className={`mt-1 block text-xs ${sub}`}>
                  {p.slots} clipper accounts · {p.durationDays / 7} weeks
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. What you get */}
      <section className="mt-8 rounded-2xl border border-border p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          What you get
        </h2>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-money">
          {formatCompact(pkg.guaranteedViews)}+
        </p>
        <p className="text-sm text-muted-foreground">guaranteed verified views</p>
        <p className="mt-3 text-sm leading-relaxed">
          For {formatNaira(pkg.price)}, {pkg.slots} clipper accounts post your video across{" "}
          {platformSentence} over {pkg.durationDays / 7} weeks. The price is fixed — you are never
          charged more.
        </p>
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
        {submitting ? "Processing…" : `Fund campaign — ${formatNaira(pkg.price)}`}
      </button>
      <p className="mt-3 mb-6 text-center text-xs text-muted-foreground">
        Payment provider is being finalised. Funding submits your campaign for review — Cloutbase sets it live once payment is confirmed.
      </p>
    </main>
  );
}
