import { createFileRoute } from "@tanstack/react-router";

import { BrandShell } from "@/features/brand/components/BrandShell";

export const Route = createFileRoute("/_authenticated/business/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Cloutbase works for brands" },
      { name: "description", content: "From picking a package to confirmed views, step by step." },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  { title: "Pick a package", body: "Each package shows the guaranteed views, the price, how many clipper accounts will post, the platforms and how long it runs." },
  { title: "Add your content", body: "Paste your video link and the exact caption, hashtags, brand tag and CTA link clippers must use." },
  { title: "Pay into escrow", body: "You pay once through Paystack. Your payment is held — it isn’t paid out while your campaign is being delivered." },
  { title: "We review and go live", body: "A Cloutbase admin reviews your campaign, then sets it live. Clippers apply and are accepted onto the roster." },
  { title: "Clippers post, views climb", body: "Clippers post your content from their own accounts. Every clip is listed on your analytics page with a link to the live post." },
  { title: "Views are confirmed", body: "A clip must stay live 5 full days before its views count. Your dashboard shows confirmed views, plus a separate grey figure for clips still confirming." },
  { title: "It ends on schedule", body: "The campaign ends automatically. You paid a fixed price for a guaranteed floor of verified views — you can never be charged more." },
];

function HowItWorks() {
  return (
    <BrandShell>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">How Cloutbase works</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">For brands and streamers, from package to confirmed views.</p>

      <ol className="mt-6 grid gap-3 md:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-border p-5">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Step {i + 1}</span>
            <p className="mt-1 text-sm font-semibold">{s.title}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs text-muted-foreground">If views fall short of the guarantee, Cloutbase credits the shortfall toward your next campaign.</p>
    </BrandShell>
  );
}
