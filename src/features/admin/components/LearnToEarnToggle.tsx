import { useLearnToEarnEnabled, useSetLearnToEarn } from "@/features/learn-to-earn/queries";

export function LearnToEarnToggle() {
  const { data: enabled, isLoading } = useLearnToEarnEnabled();
  const set = useSetLearnToEarn();
  const on = Boolean(enabled);

  return (
    <section className="flex items-center justify-between gap-4 rounded-2xl border border-border p-5">
      <div className="min-w-0">
        <h2 className="text-sm font-medium">Show Learn to earn to users</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {on
            ? "Live — users can browse and buy courses."
            : "Hidden — users only see “Coming soon”. Admins can still preview and edit courses."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Show Learn to earn to users"
        disabled={isLoading || set.isPending}
        onClick={() => set.mutate(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
          on ? "border-[#4DA3FF] bg-[#4DA3FF]" : "border-border bg-secondary"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[26px]" : "left-0.5"}`}
        />
      </button>
    </section>
  );
}
