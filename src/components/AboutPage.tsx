import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/Logo";

export type AboutStep = { title: string; body: string };

/** Shared layout for the three public "about" pages. */
export function AboutPage({
  eyebrow,
  title,
  intro,
  points,
  steps,
  ctaLabel,
  cta,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  points: string[];
  steps: AboutStep[];
  ctaLabel: string;
  cta: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-16 pt-8">
      <Link to="/" className="inline-flex">
        <Logo size="sm" />
      </Link>

      <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.1]">{title}</h1>
      <p className="mt-3 text-[15px] leading-[1.5] text-muted-foreground">{intro}</p>

      <ul className="mt-6 space-y-2.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2.5 text-[14px] leading-[1.45]">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-money" />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-3">
        {steps.map((step, i) => (
          <div key={step.title} className="rounded-[18px] border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-soft text-[12px] font-semibold text-money">
                {i + 1}
              </span>
              <span className="font-display text-[15px] font-semibold">{step.title}</span>
            </div>
            <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <span className="sr-only">{ctaLabel}</span>
        {cta}
      </div>

      <nav className="mt-8 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
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
    </main>
  );
}

export function AboutCta({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] bg-foreground p-[18px] text-center font-display text-[17px] font-semibold text-background transition-transform hover:-translate-y-0.5">
      {children}
    </div>
  );
}
