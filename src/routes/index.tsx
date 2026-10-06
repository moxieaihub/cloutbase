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

/* ------------------------------------------------------------------ */
/* Copy — edit freely. Kept to what the product already says about    */
/* itself; swap in real numbers / FAQs / testimonials when you have    */
/* them.                                                              */
/* ------------------------------------------------------------------ */

const brandSteps = [
  {
    title: "Post your video",
    body: "Add the video you want spread and set your budget in Naira.",
  },
  {
    title: "Clippers get to work",
    body: "Clippers cut it into short clips and post them on TikTok, Instagram and YouTube.",
  },
  {
    title: "Pay for real views",
    body: "Your budget turns into views your content actually earns.",
  },
];

const clipperSteps = [
  {
    title: "Pick a video",
    body: "Browse videos from brands and creators who want to be seen.",
  },
  {
    title: "Clip and post",
    body: "Cut your clips and post them on TikTok, Instagram or YouTube.",
  },
  {
    title: "Get paid",
    body: "Earn in Naira for the views your clips get.",
  },
];

const platforms = ["TikTok", "Instagram", "YouTube"];

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] uppercase tracking-[0.16em] text-muted-2 md:text-[13px]">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] md:text-5xl">
      {children}
    </h2>
  );
}

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="mt-6 flex flex-col gap-5">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-input font-display text-[13px] font-semibold">
            {i + 1}
          </span>
          <span>
            <span className="block font-display text-[16px] font-semibold tracking-[-0.02em] md:text-[17px]">
              {step.title}
            </span>
            <span className="mt-0.5 block text-[14px] leading-[1.5] text-muted-foreground">
              {step.body}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

function Landing() {
  return (
    <div className="relative">
      {/* ============================ HERO ============================ */}
      <section className="relative">
        <PlatformBackdrop />

        {/* Top bar */}
        <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-end gap-6 px-5 pt-5 md:px-8 lg:px-12">
          <nav className="hidden items-center gap-6 text-[14px] text-muted-foreground md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <Link to="/for-brands" className="transition-colors hover:text-foreground">
              For brands
            </Link>
            <Link to="/for-creators" className="transition-colors hover:text-foreground">
              For creators
            </Link>
            <Link to="/for-clippers" className="transition-colors hover:text-foreground">
              For clippers
            </Link>
            <Link to="/university" className="transition-colors hover:text-foreground">
              University
            </Link>
          </nav>
          <Link
            to="/login"
            className="rounded-full border border-input bg-card/60 px-4 py-1.5 text-[13px] font-semibold backdrop-blur transition-colors hover:border-foreground/30 md:text-[14px]"
          >
            Log in
          </Link>
        </header>

        {/* Hero content */}
        <div className="relative mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-[390px] flex-col justify-between px-5 pb-10 pt-10 md:max-w-[680px] md:px-8 md:pb-16 md:pt-16 lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:justify-normal lg:gap-16 lg:px-12 lg:pb-20 lg:pt-8">
          <div>
            <Logo size="xl" />
            <p className="mt-4 max-w-[270px] text-[15px] leading-[1.45] text-muted-foreground md:mt-6 md:max-w-lg md:text-xl lg:mt-8 lg:max-w-xl lg:text-[28px] lg:leading-[1.3]">
              Turn a budget into millions of real views. Or turn your clips into real money.
            </p>
            <p className="mt-[18px] text-[12px] uppercase tracking-[0.16em] text-muted-2 md:mt-6 md:text-[13px] lg:mt-8">
              Nigeria · TikTok · IG · YouTube
            </p>
          </div>

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
              <p className="mt-1.5 text-center text-[11px] text-muted-2 md:text-xs">
                Sample payouts
              </p>
            </div>

            {/* Header already has Log in on md+, so only show this on phones */}
            <p className="mt-3 text-center text-[13px] text-muted-foreground md:hidden">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-foreground">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ======================= BELOW THE FOLD ======================= */}
      <div className="relative z-10 bg-background/90 backdrop-blur-md">
        {/* ---------------------- HOW IT WORKS ---------------------- */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-6xl scroll-mt-6 px-5 py-16 md:px-8 md:py-24 lg:px-12"
        >
          <Eyebrow>How it works</Eyebrow>
          <SectionHeading>Two sides. One marketplace.</SectionHeading>

          <div className="mt-10 grid gap-5 md:mt-14 lg:grid-cols-2 lg:gap-6">
            {/* Brands */}
            <div className="flex flex-col rounded-[24px] border border-input bg-card p-6 md:p-8">
              <Eyebrow>For brands &amp; creators</Eyebrow>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
                Clip my video
              </h3>
              <StepList steps={brandSteps} />
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
                <Link
                  to="/signup/$type"
                  params={{ type: "business" }}
                  className="rounded-full bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background transition-all hover:-translate-y-0.5"
                >
                  Get started →
                </Link>
                <Link
                  to="/for-brands"
                  className="text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Learn more
                </Link>
              </div>
            </div>

            {/* Clippers */}
            <div className="flex flex-col rounded-[24px] border border-input bg-card p-6 md:p-8">
              <Eyebrow>For clippers</Eyebrow>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
                I'm a clipper
              </h3>
              <StepList steps={clipperSteps} />
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
                <Link
                  to="/signup/$type"
                  params={{ type: "clipper" }}
                  className="rounded-full bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background transition-all hover:-translate-y-0.5"
                >
                  Start clipping →
                </Link>
                <Link
                  to="/for-clippers"
                  className="text-[14px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Learn more
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------ PLATFORMS ------------------------ */}
        <section className="border-t border-input">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8 md:py-14 lg:px-12">
            <div>
              <Eyebrow>Where clips run</Eyebrow>
              <p className="mt-2 max-w-md font-display text-xl font-semibold leading-[1.2] tracking-[-0.02em] md:text-2xl">
                Your content, on the apps your audience already uses.
              </p>
            </div>
            <ul className="flex flex-wrap gap-3">
              {platforms.map((p) => (
                <li
                  key={p}
                  className="rounded-full border border-input bg-card px-5 py-2 text-[14px] font-semibold md:text-[15px]"
                >
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------- PAYOUTS ------------------------- */}
        <section className="border-t border-input">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-12">
            <div>
              <Eyebrow>Payouts</Eyebrow>
              <SectionHeading>Real money, paid in Naira.</SectionHeading>
              <p className="mt-4 max-w-md text-[15px] leading-[1.5] text-muted-foreground md:text-lg">
                Clippers earn from the views their clips get. Here's what payouts look like.
              </p>
            </div>
            <div className="w-full lg:max-w-md lg:justify-self-end">
              <PayoutTicker />
              <p className="mt-2 text-center text-[11px] text-muted-2 md:text-xs">
                Sample payouts
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------ UNIVERSITY ------------------------ */}
        <section className="border-t border-input">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24 lg:px-12">
            <Link
              to="/university"
              className="group flex flex-col gap-6 rounded-[24px] border border-input bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-foreground/30 md:flex-row md:items-center md:justify-between md:p-10"
            >
              <span>
                <Eyebrow>Learn</Eyebrow>
                <span className="mt-2 block font-display text-2xl font-semibold tracking-[-0.03em] md:text-4xl">
                  Cloutbase University
                </span>
                <span className="mt-2 block max-w-xl text-[15px] leading-[1.5] text-muted-foreground md:text-lg">
                  Learn how to earn — courses on clipping, streaming and growth.
                </span>
              </span>
              <span className="shrink-0 rounded-full border border-input px-5 py-2.5 text-[14px] font-semibold transition-colors group-hover:border-foreground/40">
                Enter →
              </span>
            </Link>
          </div>
        </section>

        {/* ------------------------ FINAL CTA ------------------------ */}
        <section className="border-t border-input">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center md:px-8 md:py-28 lg:px-12">
            <h2 className="mx-auto max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] md:text-6xl">
              Ready to get your clips seen?
            </h2>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center md:mt-10">
              <Link
                to="/signup/$type"
                params={{ type: "business" }}
                className="rounded-full bg-foreground px-7 py-3 text-[15px] font-semibold text-background transition-all hover:-translate-y-0.5"
              >
                Clip my video
              </Link>
              <Link
                to="/signup/$type"
                params={{ type: "clipper" }}
                className="rounded-full border border-input bg-card px-7 py-3 text-[15px] font-semibold transition-all hover:-translate-y-0.5 hover:border-foreground/30"
              >
                I'm a clipper
              </Link>
            </div>
          </div>
        </section>

        {/* -------------------------- FOOTER -------------------------- */}
        <footer className="border-t border-input">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 px-5 py-10 md:flex-row md:justify-between md:px-8 lg:px-12">
            <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-muted-2">
              <Link to="/university" className="underline-offset-4 hover:text-foreground hover:underline">
                University
              </Link>
              <Link to="/for-brands" className="underline-offset-4 hover:text-foreground hover:underline">
                For brands
              </Link>
              <Link to="/for-creators" className="underline-offset-4 hover:text-foreground hover:underline">
                For creators
              </Link>
              <Link to="/for-clippers" className="underline-offset-4 hover:text-foreground hover:underline">
                For clippers
              </Link>
              <Link to="/login" className="underline-offset-4 hover:text-foreground hover:underline">
                Log in
              </Link>
            </nav>
            <CommunityLinks />
            <p className="text-[12px] text-muted-2">
              © {new Date().getFullYear()} Cloutbase
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
