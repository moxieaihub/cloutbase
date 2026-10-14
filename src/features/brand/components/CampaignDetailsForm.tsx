import { useState } from "react";

import { KPI_TARGETS, isValidVideoLink } from "@/lib/campaign";
import { PLATFORMS, type Platform } from "@/lib/clipper";
import { fieldCls, labelCls } from "../format";

export type CampaignDetails = {
  title: string;
  sourceLink: string;
  videoLength: number;
  kpiTarget: string;
  platforms: Platform[];
  caption: string;
  hashtags: string;
  brandTag: string;
  ctaLink: string;
  watermark: File | null;
};

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{children}</h2>;
}

export function CampaignDetailsForm({
  onSubmit,
  submitting,
  error,
}: {
  onSubmit: (v: CampaignDetails) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [title, setTitle] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [videoLength, setVideoLength] = useState("");
  const [kpiTarget, setKpiTarget] = useState<string>(KPI_TARGETS[0]);
  const [platforms, setPlatforms] = useState<Platform[]>(["tiktok", "ig", "youtube"]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [brandTag, setBrandTag] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [watermark, setWatermark] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  function toggle(p: Platform) {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  function submit() {
    const len = Number(videoLength);
    const issue = !title.trim()
      ? "Give your campaign a title."
      : !isValidVideoLink(sourceLink)
        ? "Paste a valid Google Drive or direct video link."
        : !Number.isFinite(len) || len <= 0
          ? "Enter the video length in minutes."
          : platforms.length === 0
            ? "Pick at least one platform."
            : !caption.trim()
              ? "The exact caption clippers must use is required."
              : !hashtags.trim()
                ? "Hashtags are required."
                : !brandTag.trim()
                  ? "A brand tag / mention is required."
                  : !isValidVideoLink(ctaLink)
                    ? "A valid CTA link is required."
                    : null;
    setProblem(issue);
    if (issue) return;
    onSubmit({
      title: title.trim(),
      sourceLink: sourceLink.trim(),
      videoLength: len,
      kpiTarget,
      platforms,
      caption: caption.trim(),
      hashtags: hashtags.trim(),
      brandTag: brandTag.trim(),
      ctaLink: ctaLink.trim(),
      watermark,
    });
  }

  const shown = problem ?? error;

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-2">
      <section>
        <Heading>Source video</Heading>
        <label className="mt-4 block">
          <span className={labelCls}>Campaign title</span>
          <input className={fieldCls} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Podcast Ep. 12 clips" />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Google Drive or direct video link</span>
          <input className={fieldCls} value={sourceLink} maxLength={500} onChange={(e) => setSourceLink(e.target.value)} placeholder="https://drive.google.com/file/d/…" />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Video length (minutes)</span>
          <input className={fieldCls} value={videoLength} inputMode="decimal" onChange={(e) => setVideoLength(e.target.value.replace(/[^\d.]/g, ""))} placeholder="45" />
        </label>

        <div className="mt-10">
          <Heading>Platforms &amp; goal</Heading>
          <p className="mt-2 text-xs text-muted-foreground">Clips can only be posted on the platforms you pick.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {PLATFORMS.map((p) => {
              const active = platforms.includes(p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => toggle(p.value)}
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
            <select className={fieldCls} value={kpiTarget} onChange={(e) => setKpiTarget(e.target.value)}>
              {KPI_TARGETS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section>
        <Heading>Required assets</Heading>
        <p className="mt-2 text-xs text-muted-foreground">Every clipper must use these exactly as written.</p>
        <label className="mt-4 block">
          <span className={labelCls}>Exact caption</span>
          <textarea className={`${fieldCls} min-h-24`} value={caption} maxLength={1000} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Hashtags</span>
          <input className={fieldCls} value={hashtags} maxLength={300} onChange={(e) => setHashtags(e.target.value)} placeholder="#cloutbase #naija" />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Brand tag / mention</span>
          <input className={fieldCls} value={brandTag} maxLength={100} onChange={(e) => setBrandTag(e.target.value)} placeholder="@yourbrand" />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>CTA link</span>
          <input className={fieldCls} value={ctaLink} maxLength={500} onChange={(e) => setCtaLink(e.target.value)} placeholder="https://yourbrand.com/signup" />
        </label>
        <div className="mt-4">
          <span className={labelCls}>
            Watermark image <span className="text-muted-foreground">(optional)</span>
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setWatermark(e.target.files?.[0] ?? null)}
            className="mt-2 w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-sm file:text-foreground"
          />
        </div>
      </section>

      <div className="lg:col-span-2">
        {shown ? <p className="mb-4 rounded-xl border border-destructive/40 px-4 py-3 text-sm text-destructive">{shown}</p> : null}
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="w-full rounded-xl bg-foreground px-4 py-4 text-sm font-semibold text-background disabled:opacity-60 lg:max-w-sm"
        >
          {submitting ? "Saving…" : "Continue to payment"}
        </button>
      </div>
    </div>
  );
}
