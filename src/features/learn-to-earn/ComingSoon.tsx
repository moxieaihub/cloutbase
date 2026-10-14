import { UniversityShell } from "@/features/university/components/UniversityShell";

export function LearnToEarnComingSoon() {
  return (
    <UniversityShell hideTabs>
      <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-2">Learn to earn</p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight lg:text-5xl">
          Coming soon
        </h1>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          Short, practical courses on earning with clips and content are on the way. We’ll let you
          know the moment they open.
        </p>
      </div>
    </UniversityShell>
  );
}
