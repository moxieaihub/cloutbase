import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { PaidBadge } from "@/components/PaidBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabBar } from "@/components/TabBar";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import { referralLink } from "@/lib/terms";
import { NIGERIAN_BANKS, detailsComplete, formatDate, nameMatches, nextFriday } from "@/lib/payout";

export const Route = createFileRoute("/_authenticated/clipper/profile")({
  head: () => ({
    meta: [
      { title: "Payment details — Cloutbase clipper" },
      {
        name: "description",
        content:
          "Save and edit your Nigerian bank payment details any time, and track released Naira payouts.",
      },
      { property: "og:title", content: "Payment details — Cloutbase clipper" },
      {
        property: "og:description",
        content: "Bank details and payout history for Cloutbase clippers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClipperProfile,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Something went wrong loading your profile.</p>
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-28 pt-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/clipper" className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </Link>
      </header>
      <div className="mt-8">{children}</div>
      <TabBar role="clipper" />
    </main>
  );
}

function ClipperProfile() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const [realName, setRealName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["clipper-profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clipper_profiles")
        .select(
          "real_name, bank_name, bank_account_number, account_name, whatsapp, banned, strikes, is_priority, is_inhouse, max_clips_per_day",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: payouts } = useQuery({
    queryKey: ["clipper-payouts", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("id, amount, status, released_at, hold_until, created_at")
        .eq("clipper_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: unpaid } = useQuery({
    queryKey: ["clipper-unpaid", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_submissions")
        .select("earnings, paid")
        .eq("clipper_user_id", user.id);
      if (error) throw error;
      return (data ?? [])
        .filter((r) => !r.paid)
        .reduce((s, r) => s + Number(r.earnings ?? 0), 0);
    },
  });

  useEffect(() => {
    if (!profile) return;
    setRealName(profile.real_name ?? "");
    setBankName(profile.bank_name ?? "");
    setAccountNumber(profile.bank_account_number ?? "");
    setAccountName(profile.account_name ?? "");
    setWhatsapp(profile.whatsapp ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user.id,
        real_name: realName.trim() || null,
        bank_name: bankName.trim() || null,
        bank_account_number: accountNumber.trim() || null,
        account_name: accountName.trim() || null,
        whatsapp: whatsapp.trim() || null,
      };
      const { error } = await supabase
        .from("clipper_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment details saved");
      queryClient.invalidateQueries({ queryKey: ["clipper-profile", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = detailsComplete({
    real_name: realName,
    bank_name: bankName,
    bank_account_number: accountNumber,
    account_name: accountName,
  });
  const matches = nameMatches(realName, accountName);
  const numberValid = /^\d{10}$/.test(accountNumber.trim());

  if (isLoading) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Payment details</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Edit these any time — you don't need a campaign slot. Payouts are released by a Cloutbase
        admin every Friday.
      </p>

      <div className="mt-6 rounded-2xl border border-border p-5">
        <p className="text-sm text-muted-foreground">Awaiting payout</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-money">
          {formatNaira(unpaid ?? 0)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Next payout run: {formatDate(nextFriday())}
        </p>
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="real_name">Real name (as on your bank account)</Label>
          <Input
            id="real_name"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="Chinedu Okafor"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bank_name">Bank</Label>
          <Input
            id="bank_name"
            list="ng-banks"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Guaranty Trust Bank (GTBank)"
          />
          <datalist id="ng-banks">
            {NIGERIAN_BANKS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="account_number">Account number</Label>
          <Input
            id="account_number"
            inputMode="numeric"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="0123456789"
          />
          {accountNumber && !numberValid ? (
            <p className="text-xs text-muted-foreground">
              Nigerian account numbers are 10 digits.
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="account_name">Account name</Label>
          <Input
            id="account_name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Chinedu Okafor"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp (optional)</Label>
          <Input
            id="whatsapp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+234 800 000 0000"
          />
        </div>

        {complete && !matches ? (
          <div className="rounded-xl border border-foreground p-4 text-xs leading-relaxed">
            <p className="font-medium">Payout blocked — name mismatch</p>
            <p className="mt-1 text-muted-foreground">
              Your account name doesn't match your real name. Cloutbase cannot release money to an
              account in a different name. Fix this before Friday or your payout will be held.
            </p>
          </div>
        ) : null}

        {complete && matches ? (
          <p className="text-xs text-muted-foreground">
            Details verified — name matches your bank account.
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save payment details"}
        </Button>
      </form>

      <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Refer a clipper
      </h2>
      <ReferralBlock />

      <Link
        to="/university"
        className="mt-6 block rounded-xl border border-border p-4 text-sm underline-offset-4 hover:underline"
      >
        Cloutbase University — courses on clipping, streaming and growth
      </Link>

      <Link
        to="/notifications"
        className="mt-3 block rounded-xl border border-border p-4 text-sm underline-offset-4 hover:underline"
      >
        Notifications — campaign alerts, slot warnings, payout alerts
      </Link>


      <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Payout history
      </h2>
      {payouts && payouts.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {payouts.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border border-border p-4"
            >
              <div>
                <p className="text-sm font-semibold text-money">{formatNaira(Number(p.amount))}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.status === "paid"
                    ? `Released ${formatDate(p.released_at)}`
                    : p.status === "held"
                      ? `On hold until ${formatDate(p.hold_until)}`
                      : "Pending admin review"}
                </p>
              </div>
              {p.status === "paid" ? <PaidBadge /> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          No payouts yet.
        </p>
      )}
    </Shell>
  );
}

function ReferralBlock() {
  const { data } = useQuery({
    queryKey: ["my-referrals"],
    queryFn: async () => {
      const { data: code, error } = await supabase.rpc("my_referral_code");
      if (error) throw error;
      const { data: stats, error: statsError } = await supabase.rpc("my_referral_stats");
      if (statsError) throw statsError;
      return { code: code as string, total: stats?.[0]?.total ?? 0 };
    },
  });

  if (!data) return <p className="mt-3 text-xs text-muted-foreground">Loading…</p>;
  const link = referralLink(data.code);

  return (
    <div className="mt-3 rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">Your referral link</p>
      <p className="mt-1 break-all text-sm">{link}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {data.total} clipper{data.total === 1 ? "" : "s"} joined with your link
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            toast.success("Referral link copied");
          }}
        >
          Copy
        </Button>
      </div>
    </div>
  );
}
