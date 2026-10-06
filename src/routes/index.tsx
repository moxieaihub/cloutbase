import { createFileRoute, Link } from "@tanstack/react-router";

import { CommunityLinks } from "@/components/CommunityLinks";
import { Logo } from "@/components/Logo";
import { PlatformBackdrop } from "@/components/PlatformBackdrop";
import { PayoutTicker } from "@/components/PayoutTicker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cloutbase — Nigeria's content clipping marketplace" },
      {
        name: "description",
        content:
          "Post a video and pay clippers in Naira, or clip for brands and get paid. Cloutbase is Nigeria's content-clipping marketplace.",
      },
      { property: "og:title", content: "Cloutbase — Nigeria's content clipping marketplace" },
      {
        property: "og:description",
        content:
          "Post a video and pay clippers in Naira, or clip for brands and get paid.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

/*
 * Responsive behaviour
 *   < 768px  : unchanged phone layout (single column, 390px max)
 *   >= 768px : tablet — wider column, bigger type, the two role cards sit side by side
 *   >= 1024px: desktop — two columns. Hero (logo + tagline) on the left,
 *              actions (cards, payouts, login, university) on the right.
 */
function Landing() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col justify-between px-5 pb-8 pt-16 md:max-w-[680px] md:px-8 md:pb-12 md:pt-24 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:justify-normal lg:gap-16 lg:px-12 lg:py-16">
      <PlatformBackdrop />

      {/* Hero */}
      <div>
        <Logo size="xl" />
        <p className="mt-4 max-w-[270px] text-[15px] leading-[1.45] text-muted-foreground md:mt-6 md:max-w-lg md:text-xl lg:mt-8 lg:max-w-xl lg:text-[28px] lg:leading-[1.3]">
          Turn a budget into millions of real views. Or turn your clips into real money.
        </p>
        <p className="mt-[18px] text-[12px] uppercase tracking-[0.16em] text-muted-2 md:mt-6 md:text-[13px] lg:mt-8">
          Nigeria · TikTok · IG · YouTube
        </p>
      </div>

      {/* Actions */}
      <div className="mt-12 md:mt-14 lg:mt-0 lg:w-full lg:max-w-md lg:justify-self-end">
        <h1 className="sr-only">Do you want to clip a video, or are you a clipper?</h1>
        <div className="flex flex-col gap-3 pb-1.5 md:flex-row md:gap-4 lg:flex-col lg:gap-3">
          <Link
            to="/signup/$type"
            params={{ type: "business" }}
            className="rounded-[20px] border border-input bg-foreground p-[19px] text-background transition-all hover:-translate-y-0.5 md:flex-1 md:p-6 lg:flex-none"
          >
            <span className="flex items-center justify-between font-display text-[18px] font-semibold tracking-[-0.02em] md:text-[20px]">
              Clip my video <span className="opacity-45">→</span>
            </span>
            <span className="mt-[3px] block text-[13px] opacity-70 md:mt-1 md:text-sm">
              I'm a brand. Spread my content at scale.
            </span>
          </Link>
          <Link
            to="/signup/$type"
            params={{ type: "clipper" }}
            className="rounded-[20px] border border-input bg-card p-[19px] transition-all hover:-translate-y-0.5 hover:border-foreground/30 md:flex-1 md:p-6 lg:flex-none"
          >
            <span className="flex items-center justify-between font-display text-[18px] font-semibold tracking-[-0.02em] md:text-[20px]">
              I'm a clipper <span className="opacity-45">→</span>
            </span>
            <span className="mt-[3px] block text-[13px] text-muted-foreground md:mt-1 md:text-sm">
              I clip and post. Pay me for the views.
            </span>
          </Link>
        </div>

        <div className="mt-3 md:mt-4">
          <PayoutTicker />
          <p className="mt-1.5 text-center text-[11px] text-muted-2 md:text-xs">Sample payouts</p>
        </div>

        <p className="mt-3 text-center text-[13px] text-muted-foreground md:mt-4 md:text-sm">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-foreground">
            Log in
          </Link>
        </p>

        <Link
          to="/university"
          className="mt-4 flex items-center justify-between rounded-[16px] border border-input bg-card p-[15px] transition-all hover:-translate-y-0.5 hover:border-foreground/30 md:mt-5 md:p-5"
        >
          <span>
            <span className="font-display text-[15px] font-semibold tracking-[-0.02em] md:text-[17px]">
              Cloutbase University
            </span>
            <span className="mt-[2px] block text-[12px] text-muted-foreground md:text-[13px]">
              Learn how to earn — courses on clipping, streaming and growth.
            </span>
          </span>
          <span className="text-[12px] text-muted-2 md:text-[13px]">Enter →</span>
        </Link>

        <nav className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12px] text-muted-2 md:mt-6 md:text-[13px]">
          <Link to="/university" className="underline-offset-4 hover:text-foreground hover:underline">
            University
          </Link>
          <span aria-hidden="true">·</span>
          <Link to="/for-brands" className="underline-offset-4 hover:text-foreground hover:underline">
            For brands
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            to="/for-creators"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            For creators
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            to="/for-clippers"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            For clippers
          </Link>
        </nav>

        <div className="mt-4 flex justify-center md:mt-5">
          <CommunityLinks />
        </div>
      </div>
    </main>
  );
}
