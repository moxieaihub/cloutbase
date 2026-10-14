import { createFileRoute } from "@tanstack/react-router";

import { BrandShell } from "@/features/brand/components/BrandShell";
import { PackageCard } from "@/features/brand/components/PackageCard";
import { usePackages } from "@/features/brand/queries";

export const Route = createFileRoute("/_authenticated/business/packages")({
  head: () => ({
    meta: [
      { title: "Choose a package — Cloutbase" },
      { name: "description", content: "Pick how many views you want. Cloutbase handles the clippers." },
    ],
  }),
  component: Packages,
});

function Packages() {
  const { data, isLoading } = usePackages();

  return (
    <BrandShell>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Choose a package</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Pick the number of views you want. We put real clippers on your video and guarantee delivery.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading packages…</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(data ?? []).map((p) => (
            <PackageCard key={p.id} pkg={p} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Cloutbase retains a service commission from each campaign.
      </p>
    </BrandShell>
  );
}
