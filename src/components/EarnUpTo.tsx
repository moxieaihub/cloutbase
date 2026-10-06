import { formatNaira, formatRate } from "@/lib/campaign";

type Props = {
  ceiling: number;
  ratePer1000: number;
  size?: "sm" | "lg";
};

/**
 * Display rule: campaigns shown to clippers always lead with the ceiling.
 * The per-view rate is never the headline.
 */
export function EarnUpTo({ ceiling, ratePer1000, size = "lg" }: Props) {
  return (
    <div>
      <p
        className={
          size === "lg"
            ? "text-3xl font-semibold tracking-tight text-money"
            : "text-xl font-semibold tracking-tight text-money"
        }
      >
        Earn up to {formatNaira(ceiling)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{formatRate(ratePer1000)}</p>
    </div>
  );
}
