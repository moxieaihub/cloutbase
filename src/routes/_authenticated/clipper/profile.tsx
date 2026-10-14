import { createFileRoute, Link } from "@tanstack/react-router";

import { BankDetailsForm } from "@/features/clipper/components/BankDetailsForm";
import { ClipperShell } from "@/features/clipper/components/ClipperShell";
import { LinkedAccounts } from "@/features/clipper/components/LinkedAccounts";
import { ReferralBlock } from "@/features/clipper/components/ReferralBlock";

export const Route = createFileRoute("/_authenticated/clipper/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Cloutbase clipper" },
      { name: "description", content: "Linked accounts, payment details and your referral link." },
    ],
  }),
  component: ClipperProfile,
});

function ClipperProfile() {
  const { user } = Route.useRouteContext();

  return (
    <ClipperShell>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Profile</h1>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground md:text-sm">
        Everything about you as a clipper — no campaign slot needed to edit it.
      </p>

      <div className="mt-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="space-y-10">
          <LinkedAccounts userId={user.id} />
          <BankDetailsForm userId={user.id} />
        </div>
        <div className="mt-10 space-y-6 lg:mt-0">
          <ReferralBlock />
          <Link
            to="/notifications"
            className="block rounded-xl border border-border p-4 text-sm underline-offset-4 hover:underline"
          >
            Notifications — campaign alerts, slot warnings, payout alerts
          </Link>
        </div>
      </div>
    </ClipperShell>
  );
}
