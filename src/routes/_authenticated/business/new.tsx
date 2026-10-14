import { useState } from "react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";

import { BrandShell } from "@/features/brand/components/BrandShell";
import { CampaignDetailsForm, type CampaignDetails } from "@/features/brand/components/CampaignDetailsForm";
import { weeks } from "@/features/brand/format";
import { useCreateCampaign, usePackages } from "@/features/brand/queries";
import { supabase } from "@/integrations/supabase/client";
import { formatCompact, formatNaira } from "@/lib/campaign";

type Search = { package?: string | undefined };

export const Route = createFileRoute("/_authenticated/business/new")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    package: typeof s["package"] === "string" ? (s["package"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New campaign — Cloutbase" },
      { name: "description", content: "Add your video and the exact caption, then pay to start your campaign." },
    ],
  }),
  component: NewCampaign,
});

function NewCampaign() {
  const { user } = Route.useRouteContext();
  const { package: packageId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: packages, isLoading } = usePackages();
  const create = useCreateCampaign();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!packageId) return <Navigate to="/business/packages" replace />;
  const pkg = (packages ?? []).find((p) => p.id === packageId);

  async function submit(v: CampaignDetails) {
    if (!pkg) return;
    setError(null);
    setBusy(true);
    try {
      let watermarkPath: string | null = null;
      if (v.watermark) {
        const ext = v.watermark.name.split(".").pop() ?? "png";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("campaign-assets").upload(path, v.watermark, { upsert: false });
        if (upErr) throw upErr;
        watermarkPath = path;
      }
      const id = await create.mutateAsync({
        packageId: pkg.id,
        title: v.title,
        sourceLink: v.sourceLink,
        videoLength: v.videoLength,
        kpiTarget: v.kpiTarget,
        platforms: v.platforms,
        caption: v.caption,
        hashtags: v.hashtags,
        brandTag: v.brandTag,
        ctaLink: v.ctaLink,
        watermarkPath,
      });
      navigate({ to: "/business/pay/$campaignId", params: { campaignId: id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BrandShell back={{ to: "/business/packages", label: "Change package" }}>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">New campaign</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : !pkg ? (
        <p className="mt-6 text-sm text-muted-foreground">
          That package isn’t available.{" "}
          <Link to="/business/packages" className="underline underline-offset-4">
            Pick another
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{pkg.name}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-[#4DA3FF]">
                {formatCompact(pkg.view_range_low)} guaranteed views
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {pkg.slots} clipper accounts · {weeks(pkg.duration_days)} ·{" "}
              <span className="font-semibold text-price">{formatNaira(Number(pkg.price_to_brand))}</span>
            </p>
          </div>

          <CampaignDetailsForm onSubmit={submit} submitting={busy} error={error} />
        </>
      )}
    </BrandShell>
  );
}
