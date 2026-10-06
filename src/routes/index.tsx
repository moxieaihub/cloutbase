import { useState } from "react";
import type { ReactNode } from "react";
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

const heroChips = ["Paid in Naira", "TikTok · Instagram · YouTube", "Built for Nigeria"];

/* ------------------------------------------------------------------ */
/* Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12px] uppercase tracking-[0.16em] text-muted-2 md:text-[13px]">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
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

/*
 * The big "xl" logo scaled down for the header / footer.
 * If your Logo component has a smaller size prop (e.g. "sm" or "md"),
 * you can swap it in here and delete the scale wrapper.
 */
function BrandMark() {
  return (
    <span className="flex h-8 w-[132px] items-center" aria-label="Cloutbase">
      <span className="block shrink-0 origin-left scale-[0.55] whitespace-nowrap">
        <Logo size="xl" />
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                             */
/* ------------------------------------------------------------------ */

function NavLinks({ className, onNavigate }: { className: string; onNavigate?: () => void }) {
  return (
    <>
      <a href="#how-it-works" className={className} onClick={onNavigate}>
        How it works
      </a>
      <Link to="/for-brands" className={className} onClick={onNavigate}>
        For brands
      </Link>
      <Link to="/for-creators" className={className} onClick={onNavigate}>
        For creators
      </Link>
      <Link to="/for-clippers" className={className} onClick={onNavigate}>
        For clippers
      </Link>
      <Link to="/university" className={className} onClick={onNavigate}>
        University
      </Link>
    </>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto max-w-6xl rounded-2xl border border-input bg-background/70 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 md:px-5">
          <Link to="/" onClick={close} aria-label="Cloutbase home">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLinks className="rounded-full px-3.5 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground" />
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden rounded-full px-4 py-2 text-[14px] font-semibold transition-colors hover:bg-card md:inline-flex"
            >
              Log in
            </Link>
            <a
              href="#get-started"
              className="rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background transition-all hover:-translate-y-0.5 md:text-[14px]"
            >
              Get started
            </a>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-input md:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {open ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div id="mobile-menu" className="border-t border-input px-3 pb-3 pt-2 md:hidden">
            <nav className="flex flex-col" aria-label="Mobile">
              <NavLinks
                className="rounded-xl px-3 py-3 text-[15px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                onNavigate={close}
              />
              <Link
                to="/login"
                onClick={close}
                className="rounded-xl px-3 py-3 text-[15px] font-semibold transition-colors hover:bg-card"
              >
                Log in
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                             */
/* ------------------------------------------------------------------ */

function SiteFooter() {
  const year = new Date().getFullYear();
  const heading = "text-[12px] font-semibold uppercase tracking-[0.14em] text-foreground";
  const item =
    "text-[14px] text-muted-foreground transition-colors hover:text-foreground";

  return (
    <footer className="border-t border-input">
      <div className="mx-auto w-full max-w-6xl px-5 pb-8 pt-14 md:px-8 md:pt-16 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandMark />
            <p className="mt-4 max-w-xs text-[14px] leading-[1.6] text-muted-foreground">
              Nigeria's content clipping marketplace. Post a video and pay clippers in Naira, or
              clip for brands and get paid.
            </p>
            <div className="mt-5">
              <CommunityLinks />
            </div>
          </div>

          {/* Product */}
          <nav aria-label="Product">
            <h3 className={heading}>Product</h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a href="#how-it-works" className={item}>
                  How it works
                </a>
              </li>
              <li>
                <a href="#payouts" className={item}>
                  Payouts
                </a>
              </li>
              <li>
                <Link to="/university" className={item}>
                  University
                </Link>
              </li>
            </ul>
          </nav>

          {/* Audiences */}
          <nav aria-label="Who it's for">
            <h3 className={heading}>Who it's for</h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link to="/for-brands" className={item}>
                  For brands
                </Link>
              </li>
              <li>
                <Link to="/for-creators" className={item}>
                  For creators
                </Link>
              </li>
              <li>
                <Link to="/for-clippers" className={item}>
                  For clippers
                </Link>
              </li>
            </ul>
          </nav>

          {/* Get started */}
          <nav aria-label="Get started">
            <h3 className={heading}>Get started</h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <Link to="/signup/$type" params={{ type: "business" }} className={item}>
                  Clip my video
                </Link>
              </li>
              <li>
                <Link to="/signup/$type" params={{ type: "clipper" }} className={item}>
                  I'm a clipper
                </Link>
              </li>
              <li>
                <Link to="/login" className={item}>
                  Log in
                </Link>
              </li>
            </ul>
          </nav>

          {/* Legal — plain anchors: create /terms and /privacy routes, or change these hrefs */}
          <nav aria-label="Legal">
            <h3 className={heading}>Legal</h3>
            <ul className="mt-4 flex flex-col gap-3">
              <li>
                <a href="/terms" className={item}>
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/privacy" className={item}>
                  Privacy Policy
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-input pt-6 text-[12px] text-muted-2 md:flex-row md:items-center md:justify-between">
          <p>© {year} Cloutbase. All rights reserved.</p>
          <p>Payouts shown on this page are samples for illustration.</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

function Landing() {
  return (
    <div className="relative overflow-x-clip">
      <SiteHeader />

      {/* ============================ HERO ============================ */}
      <section className="relative">
        <PlatformBackdrop />

        <div className="relative mx-auto flex w-full max-w-[440px] flex-col gap-12 px-5 pb-16 pt-10 md:max-w-[760px] md:gap-14 md:px-8 md:pb-24 md:pt-16 lg:grid lg:min-h-[calc(100svh-96px)] lg:max-w-6xl lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:gap-16 lg:px-12 lg:pb-20 lg:pt-10">
          {/* Hero copy */}
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-input bg-card/60 px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground backdrop-blur md:text-[13px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Nigeria's content clipping marketplace
            </p>

            <h1 className="mt-5 font-display text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] md:mt-6 md:text-6xl lg:text-[52px] xl:text-[64px]">
              Turn a budget into millions of real views.
              <span className="mt-1 block text-muted-foreground">
                Or turn your clips into real money.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-[1.6] text-muted-foreground md:mt-6 md:text-lg">
              Cloutbase connects brands and creators with clippers across Nigeria. Post a video,
              set your budget in Naira, and let clippers spread it on TikTok, Instagram and
              YouTube — or clip for brands and get paid for the views you earn.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2 md:mt-8">
              {heroChips.map((chip) => (
                <li
                  key={chip}
                  className="rounded-full border border-input bg-card/60 px-3.5 py-1.5 text-[12px] font-medium backdrop-blur md:text-[13px]"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero actions */}
          <div
            className="flex w-full flex-col gap-5 lg:max-w-md lg:justify-self-end"
            role="group"
            aria-label="Choose how you want to use Cloutbase"
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              <Link
                to="/signup/$type"
                params={{ type: "business" }}
                className="flex flex-col justify-between gap-1 rounded-[20px] border border-input bg-foreground p-5 text-background transition-all hover:-translate-y-0.5 md:p-6"
              >
                <span className="flex items-center justify-between font-display text-[18px] font-semibold tracking-[-0.02em] md:text-[20px]">
                  Clip my video <span className="opacity-45">→</span>
                </span>
                <span className="block text-[13px] opacity-70 md:text-sm">
                  I'm a brand. Spread my content at scale.
                </span>
              </Link>
              <Link
                to="/signup/$type"
                params={{ type: "clipper" }}
                className="flex flex-col justify-between gap-1 rounded-[20px] border border-input bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-foreground/30 md:p-6"
              >
                <span className="flex items-center justify-between font-display text-[18px] font-semibold tracking-[-0.02em] md:text-[20px]">
                  I'm a clipper <span className="opacity-45">→</span>
                </span>
                <span className="block text-[13px] text-muted-foreground md:text-sm">
                  I clip and post. Pay me for the views.
                </span>
              </Link>
            </div>

            <div>
              <PayoutTicker />
              <p className="mt-2 text-center text-[11px] text-muted-2 md:text-xs">
                Sample payouts
              </p>
            </div>

            {/* Header already has Log in on md+, so only show this on phones */}
            <p className="text-center text-[13px] text-muted-foreground md:hidden">
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
          className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-16 md:px-8 md:py-24 lg:px-12"
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
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
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
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 pt-2">
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
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-12 md:flex-row md:items-center md:justify-between md:px-8 md:py-14 lg:px-12">
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
        <section id="payouts" className="scroll-mt-24 border-t border-input">
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
              <span className="shrink-0 self-start rounded-full border border-input px-5 py-2.5 text-[14px] font-semibold transition-colors group-hover:border-foreground/40 md:self-auto">
                Enter →
              </span>
            </Link>
          </div>
        </section>

        {/* ------------------------ FINAL CTA ------------------------ */}
        <section id="get-started" className="scroll-mt-24 border-t border-input">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center md:px-8 md:py-28 lg:px-12">
            <h2 className="mx-auto max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] md:text-6xl">
              Ready to get your clips seen?
            </h2>
            <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-4 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-5 md:mt-12">
              <Link
                to="/signup/$type"
                params={{ type: "business" }}
                className="rounded-full bg-foreground px-8 py-3.5 text-center text-[15px] font-semibold text-background transition-all hover:-translate-y-0.5 sm:min-w-[200px]"
              >
                Clip my video
              </Link>
              <Link
                to="/signup/$type"
                params={{ type: "clipper" }}
                className="rounded-full border border-input bg-card px-8 py-3.5 text-center text-[15px] font-semibold transition-all hover:-translate-y-0.5 hover:border-foreground/30 sm:min-w-[200px]"
              >
                I'm a clipper
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
