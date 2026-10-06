import { formatNaira } from "@/lib/campaign";

/** Sample payout ticker — illustrative figures shown on the landing page. */
const SAMPLE = [
  { id: "0803•••4471", amount: 42500 },
  { id: "0906•••1188", amount: 18000 },
  { id: "0701•••9032", amount: 96000 },
  { id: "0814•••6725", amount: 27500 },
  { id: "0902•••3390", amount: 64000 },
  { id: "0705•••8214", amount: 15000 },
];

export function PayoutTicker() {
  const row = [...SAMPLE, ...SAMPLE];

  return (
    <div className="relative overflow-hidden rounded-full border border-border bg-card/70 py-2 backdrop-blur-sm">
      <div className="flex w-max gap-6" style={{ animation: "cb-marquee 26s linear infinite" }}>
        {row.map((p, i) => (
          <span
            key={`${p.id}-${i}`}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap px-1 text-[12px] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-money" />
            {p.id} got paid

            <span className="font-display font-semibold text-money">
              {formatNaira(p.amount)}
            </span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" />
    </div>
  );
}
