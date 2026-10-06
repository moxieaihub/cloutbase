import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";

type Step = { title: string; body: string };

type AboutPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  points: string[];
  steps: Step[];
  ctaLabel: string;
  cta: ReactNode;
};

/* Used inside a <Link> by the route files, so it renders a span, not a button. */
export function AboutCta({ children }: { children: ReactNode }) {
  return (
    <span className="flex w-full items-center justify-center rounded-[18px] bg-foreground px-6 py-[18px] font-display text-[16px] font-semibold tracking-[-0.01em] text-background transition-all hover:-translate-y-0.5 hover:opacity-90 md:min-w-[280px]">
      {children}
    </span>
  );
}

export function AboutPage({ eyebrow, title, intro, points, steps, ctaLabel, cta }: AboutPageProps) {
  const footerLink =
    "underline-offset-4 transition-colors hover:text-foreground hover:underline";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="px-5 pt-5 md:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link to="/" aria-label="Cloutbase home">
            <Logo size="lg" />
          </Link>
          <nav className="flex items-center gap-1 text-[14px]" aria-label="Main">
            <Link
              to="/for-brands"
              className="hidden rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:inline-flex"
            >
              For brands
            </Link>
            <Link
              to="/for-creators"
              className="hidden rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:inline-flex"
            >
              For creators
            </Link>
            <Link
              to="/for-clippers"
              className="hidden rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:inline-flex"
            >
              For clippers
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-input px-4 py-2 font-semibold transition-colors hover:border-foreground/40"
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-[440px] flex-1 px-5 pb-16 pt-12 md:max-w-3xl md:px-8 md:pt-16 lg:grid lg:max-w-6xl lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-16 lg:px-12 lg:pt-20">
        {/* Left: message */}
        <div>
          <p className="text-[12px] uppercase tracking-[0.16em] text-muted-2 md:text-[13px]">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-5xl lg:text-[56px]">
            {title}
          </h1>
          <p className="mt-5 text-[15px] leading-[1.6] text-muted-foreground md:text-lg">
            {intro}
          </p>

          <ul className="mt-8 flex flex-col gap-3.5 md:gap-4">
            {points.map((point) => (
              <li key={point} className="flex gap-3 text-[14px] leading-[1.5] md:text-[16px]">
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 md:mt-2"
                  aria-hidden="true"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: steps + CTA */}
        <div className="mt-10 lg:sticky lg:top-8 lg:mt-0">
          <ol className="flex flex-col gap-4">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="rounded-[18px] border border-input bg-card p-5 md:p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-[12px] font-semibold text-emerald-400">
                    {i + 1}
                  </span>
                  <h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] md:text-[18px]">
                    {step.title}
                  </h2>
                </div>
                <p className="mt-3 text-[14px] leading-[1.55] text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div
            role="group"
            aria-label={ctaLabel}
            className="mt-8 [&>a]:block md:[&>a]:inline-block lg:[&>a]:block"
          >
            {cta}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-input">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-8 text-[13px] text-muted-2 md:flex-row md:justify-between md:px-8 lg:px-12">
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Footer">
            <Link to="/for-brands" className={footerLink}>
              For brands
            </Link>
            <Link to="/for-creators" className={footerLink}>
              For creators
            </Link>
            <Link to="/for-clippers" className={footerLink}>
              For clippers
            </Link>
            <Link to="/university" className={footerLink}>
              University
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} Cloutbase</p>
        </div>
      </footer>
    </div>
  );
}
