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

function Landing() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[390px] flex-col justify-between px-5 pb-8 pt-16">
      <PlatformBackdrop />
      <div>
        <Logo size="xl" />
        <p className="mt-4 max-w-[270px] text-[15px] leading-[1.45] text-muted-foreground">
          Turn a budget into millions of real views. Or turn your clips into real money.
        </p>
        <p className="mt-[18px] text-[12px] uppercase tracking-[0.16em] text-muted-2">
          Nigeria · TikTok · IG · YouTube
        </p>
      </div>

      <div className="mt-12">
        <h1 className="sr-only">Do you want to clip a video, or are you a clipper?</h1>
        <div className="flex flex-col gap-3 pb-1.5">
          <Link
            to="/signup/$type"
            params={{ type: "business" }}
            className="rounded-[20px] border border-input bg-foreground p-[19px] text-background transition-all hover:-translate-y-0.5"
          >
            <span className="flex items-center justify-between font-display text-[18px] font-semibold tracking-[-0.02em]">
              Clip my video <span className="opacity-45">→</span>
            </span>
            <span className="mt-[3px] block text-[13px] opacity-70">
              I'm a brand. Spread my content at scale.
            </span>
          </Link>
          <Link
            to="/signup/$type"
            params={{ type: "clipper" }}
            className="rounded-[20px] border border-input bg-card p-[19px] transition-all hover:-translate-y-0.5 hover:border-foreground/30"
          >
            <span className="flex items-center justify-between font-display text-[18px] font-semibold tracking-[-0.02em]">
              I'm a clipper <span className="opacity-45">→</span>
            </span>
            <span className="mt-[3px] block text-[13px] text-muted-foreground">
              I clip and post. Pay me for the views.
            </span>
          </Link>
        </div>

        <div className="mt-3">
          <PayoutTicker />
          <p className="mt-1.5 text-center text-[11px] text-muted-2">Sample payouts</p>
        </div>

        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-foreground">
            Log in
          </Link>
        </p>

        <Link
          to="/university"
          className="mt-4 flex items-center justify-between rounded-[16px] border border-input bg-card p-[15px] transition-all hover:-translate-y-0.5 hover:border-foreground/30"
        >
          <span>
            <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">
              Cloutbase University
            </span>
            <span className="mt-[2px] block text-[12px] text-muted-foreground">
              Learn how to earn — courses on clipping, streaming and growth.
            </span>
          </span>
          <span className="text-[12px] text-muted-2">Enter →</span>
        </Link>

        <nav className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12px] text-muted-2">
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

        <div className="mt-4 flex justify-center">
          <CommunityLinks />
        </div>
      </div>
    </main>
  );
}

