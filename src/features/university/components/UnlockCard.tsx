import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/campaign";

export function UnlockCard({
  price,
  outcomeTag,
  paying,
  onUnlock,
}: {
  price: number;
  outcomeTag: string | null;
  paying: boolean;
  onUnlock: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border p-5">
      <p className="text-[13px] text-muted-foreground">{outcomeTag ?? "Lifetime access"}</p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-price">
        {formatNaira(price)}
      </p>
      <p className="mt-1 text-[12px] text-muted-2">One payment. Yours forever — no subscription.</p>
      <Button onClick={onUnlock} disabled={paying} className="mt-4 w-full">
        {paying ? "Opening checkout…" : "Unlock this course"}
      </Button>
    </section>
  );
}
