import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { PaidBadge } from "@/components/PaidBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { formatDate, nextFriday } from "@/lib/payout";

export const Route = createFileRoute("/_authenticated/admin/payouts")({
  head: () => ({
    meta: [
      { title: "Weekly payout queue — Cloutbase admin" },
      {
        name: "description",
        content:
          "Friday payout review queue: check clipper bank details, release Naira payments or hold them until Friday.",
      },
      { property: "og:title", content: "Weekly payout queue — Cloutbase admin" },
      {
        property: "og:description",
        content: "Admin review queue for releasing clipper payouts in Naira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPayouts,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Something went wrong loading the queue.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </Shell>
  ),
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/admin" className="hover:text-foreground">
            View tracking
          </Link>
          <Link to="/admin/payments" className="hover:text-foreground">
            Payment provider
          </Link>
        </div>
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function AdminPayouts() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reference, setReference] = useState("");

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    },
  });

  const { data: queue, isLoading } = useQuery({
    enabled: isAdmin === true,
    queryKey: ["admin-payout-queue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_payout_queue");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: paid } = useQuery({
    enabled: isAdmin === true,
    queryKey: ["admin-paid-payouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("id, amount, released_at, clipper_user_id, transfer_reference")
        .eq("status", "paid")
        .order("released_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bonus } = useQuery({
    enabled: isAdmin === true,
    queryKey: ["admin-bonus-pool"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_bonus_pool");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-payout-queue"] });
    queryClient.invalidateQueries({ queryKey: ["admin-paid-payouts"] });
  }

  const release = useMutation({
    mutationFn: async (clipperId: string) => {
      const ref = reference.trim();
      const { error } = await supabase.rpc(
        "admin_release_payout",
        ref ? { _clipper_user_id: clipperId, _reference: ref } : { _clipper_user_id: clipperId },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment released and marked Paid ✓");
      setReference("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hold = useMutation({
    mutationFn: async (clipperId: string) => {
      const { error } = await supabase.rpc("admin_hold_payout", { _clipper_user_id: clipperId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Held until Friday");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (roleLoading)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  if (!isAdmin)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">This area is for Cloutbase admins only.</p>
      </Shell>
    );

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Weekly payout queue</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Payouts run every Friday and are released by an admin — never automatically. Next run:{" "}
        {formatDate(nextFriday())}. Releasing here records the payout in Cloutbase; the actual bank
        transfer must be sent through Paystack once the keys are configured.
      </p>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <p className="text-sm text-muted-foreground">Bonus reserve available</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-money">
          {formatNaira(Number(bonus?.rollover ?? 0))}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          20% of every funded campaign is held here and paid out to clippers as bonuses. Unused
          reserve rolls into the next bonus round — it is never returned to Cloutbase.
          {bonus ? ` Paid so far: ${formatNaira(Number(bonus.bonuses_paid ?? 0))}.` : ""}
        </p>
      </div>



      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading queue…</p>
      ) : queue && queue.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {queue.map((row) => {
            const open = openId === row.clipper_user_id;
            const blocked = !row.details_complete || !row.name_matches || row.banned;
            return (
              <li key={row.clipper_user_id} className="rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">@{row.username}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.clip_count} unpaid clip{row.clip_count === 1 ? "" : "s"}
                      {Number(row.held_amount) > 0
                        ? ` · held until ${formatDate(row.hold_until)}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-lg font-semibold tracking-tight text-money">
                    {formatNaira(Number(row.unpaid_amount))}
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-border p-4 text-xs">
                  <dl className="space-y-1">
                    <Row label="Real name" value={row.real_name} />
                    <Row label="Bank" value={row.bank_name} />
                    <Row label="Account number" value={row.bank_account_number} />
                    <Row label="Account name" value={row.account_name} />
                  </dl>
                </div>

                {row.banned ? (
                  <p className="mt-3 rounded-xl border border-foreground p-3 text-xs">
                    This clipper is banned — payout blocked.
                  </p>
                ) : !row.details_complete ? (
                  <p className="mt-3 rounded-xl border border-foreground p-3 text-xs">
                    Payment details incomplete — payout blocked.
                  </p>
                ) : !row.name_matches ? (
                  <p className="mt-3 rounded-xl border border-foreground p-3 text-xs">
                    <span className="font-medium">Name mismatch.</span> The account name doesn't
                    match the real name — payout blocked until the clipper corrects it.
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={blocked || release.isPending}
                    onClick={() => setOpenId(open ? null : row.clipper_user_id)}
                  >
                    Release Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={hold.isPending}
                    onClick={() => hold.mutate(row.clipper_user_id)}
                  >
                    Hold until Friday
                  </Button>
                </div>

                {open && !blocked ? (
                  <div className="mt-4 space-y-2 rounded-xl border border-border p-4">
                    <Label htmlFor={`ref-${row.clipper_user_id}`} className="text-xs">
                      Paystack transfer reference (after you send the transfer)
                    </Label>
                    <Input
                      id={`ref-${row.clipper_user_id}`}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="TRF_xxxxxxxx (optional)"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={release.isPending}
                      onClick={() => release.mutate(row.clipper_user_id)}
                    >
                      {release.isPending
                        ? "Releasing…"
                        : `Confirm release of ${formatNaira(Number(row.unpaid_amount))}`}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Nothing waiting for payout.
        </p>
      )}

      <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Recently released
      </h2>
      {paid && paid.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {paid.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border p-4 text-sm"
            >
              <div>
                <p className="font-semibold text-money">{formatNaira(Number(p.amount))}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(p.released_at)}
                  {p.transfer_reference ? ` · ${p.transfer_reference}` : ""}
                </p>
              </div>
              <PaidBadge />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No payouts released yet.
        </p>
      )}
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value?.trim() || "—"}</dd>
    </div>
  );
}
