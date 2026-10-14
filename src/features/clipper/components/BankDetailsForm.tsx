import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NIGERIAN_BANKS, detailsComplete, nameMatches } from "@/lib/payout";
import { useClipperProfile, useSaveBankDetails } from "../queries";

type Initial = {
  real_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  account_name: string | null;
  whatsapp: string | null;
};

export function BankDetailsForm({ userId }: { userId: string }) {
  const { data: profile, isLoading } = useClipperProfile(userId);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  // key re-initialises the fields once the saved details arrive
  return <Form key={profile ? "loaded" : "empty"} userId={userId} initial={profile ?? null} />;
}

function Form({ userId, initial }: { userId: string; initial: Initial | null }) {
  const save = useSaveBankDetails(userId);
  const [realName, setRealName] = useState(initial?.real_name ?? "");
  const [bankName, setBankName] = useState(initial?.bank_name ?? "");
  const [accountNumber, setAccountNumber] = useState(initial?.bank_account_number ?? "");
  const [accountName, setAccountName] = useState(initial?.account_name ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");

  const complete = detailsComplete({
    real_name: realName,
    bank_name: bankName,
    bank_account_number: accountNumber,
    account_name: accountName,
  });
  const matches = nameMatches(realName, accountName);
  const numberValid = /^\d{10}$/.test(accountNumber.trim());

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Payment details</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Edit any time. Payouts are released by a Cloutbase admin every Friday, only to an account in your own name.
      </p>

      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({ realName, bankName, accountNumber, accountName, whatsapp });
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="real_name">Real name (as on your bank account)</Label>
          <Input id="real_name" value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="Chinedu Okafor" />
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
            <p className="text-xs text-muted-foreground">Nigerian account numbers are 10 digits.</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="account_name">Account name</Label>
          <Input id="account_name" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Chinedu Okafor" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp (optional)</Label>
          <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 800 000 0000" />
        </div>

        {complete && !matches ? (
          <div className="rounded-xl border border-foreground p-4 text-xs leading-relaxed">
            <p className="font-medium">Payout blocked — name mismatch</p>
            <p className="mt-1 text-muted-foreground">
              Your account name doesn’t match your real name. Cloutbase can’t release money to an account in a
              different name. Fix this before Friday or your payout will be held.
            </p>
          </div>
        ) : null}
        {complete && matches ? (
          <p className="text-xs text-muted-foreground">Details verified — name matches your bank account.</p>
        ) : null}

        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save payment details"}
        </Button>
      </form>
    </section>
  );
}
