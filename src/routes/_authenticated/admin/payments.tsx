import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

/**
 * Payment provider is intentionally OPEN — Cloutbase is not locked to Paystack.
 * Add a new provider by:
 *   1. adding it to PROVIDERS below,
 *   2. allowing the value in the paystack_config.provider check constraint,
 *   3. handling it in src/lib/courses.functions.ts (init + confirm).
 * Until a provider is chosen, everything runs in "manual" mode: no gateway is
 * called and money is settled by hand — Cloutbase never fakes a transfer.
 */
const PROVIDERS = [
  { value: "manual", label: "Manual / no gateway yet", hint: "Payments settled by hand while we choose a provider." },
  { value: "paystack", label: "Paystack", hint: "Checkout for funding, Transfers for payouts." },
  { value: "flutterwave", label: "Flutterwave", hint: "Alternative Nigerian gateway." },
  { value: "stripe", label: "Stripe", hint: "International cards." },
  { value: "other", label: "Other / custom", hint: "Anything we wire up later." },
] as const;

export const Route = createFileRoute("/_authenticated/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payment provider — Cloutbase admin" },
      {
        name: "description",
        content:
          "Choose the payment provider Cloutbase uses for brand funding and clipper payouts. Provider-agnostic — Paystack is only one option.",
      },
      { property: "og:title", content: "Payment provider — Cloutbase admin" },
      {
        property: "og:description",
        content: "Provider-agnostic payment configuration for Cloutbase money in and money out.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsConfig,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Something went wrong loading the config.</p>
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
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/admin/payouts" className="text-sm text-muted-foreground hover:text-foreground">
          Payout queue
        </Link>
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function PaymentsConfig() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState<string>("manual");
  const [providerLabel, setProviderLabel] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [notes, setNotes] = useState("");
  const [liveMode, setLiveMode] = useState(false);

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    },
  });

  const { data: config } = useQuery({
    enabled: isAdmin === true,
    queryKey: ["payment-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paystack_config")
        .select(
          "enabled, live_mode, public_key, secret_key_secret_name, notes, provider, provider_label, updated_at",
        )
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!config) return;
    setPublicKey(config.public_key ?? "");
    setNotes(config.notes ?? "");
    setLiveMode(config.live_mode);
    setProvider(config.provider ?? "manual");
    setProviderLabel(config.provider_label ?? "");
  }, [config]);

  const save = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("paystack_config")
        .update({
          provider,
          provider_label: providerLabel.trim() || null,
          public_key: publicKey.trim() || null,
          notes: notes.trim() || null,
          live_mode: liveMode,
          enabled: provider === "manual" ? false : enabled,
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment settings saved");
      queryClient.invalidateQueries({ queryKey: ["payment-config"] });
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

  const manual = provider === "manual";

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Payment provider</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Cloutbase is not tied to any single provider. Right now the platform runs in manual mode:
        brands fund and clippers get paid by hand, and no gateway is called. Pick a provider here
        whenever you settle on one — money in (funding) and money out (payouts) both follow this
        setting.
      </p>

      <div className="mt-6 space-y-2">
        <Label className="text-xs">Provider</Label>
        {PROVIDERS.map((p) => (
          <label
            key={p.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
              provider === p.value ? "border-foreground" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="provider"
              className="mt-1 size-4 accent-foreground"
              checked={provider === p.value}
              onChange={() => setProvider(p.value)}
            />
            <span>
              <span className="font-medium">{p.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{p.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(config?.enabled ?? false);
        }}
      >
        {provider === "other" && (
          <div className="space-y-1.5">
            <Label htmlFor="provider-label">Provider name</Label>
            <Input
              id="provider-label"
              value={providerLabel}
              onChange={(e) => setProviderLabel(e.target.value)}
              placeholder="e.g. Moniepoint, Squad, Kora…"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="pk">Public key</Label>
          <Input
            id="pk"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder={manual ? "Not needed in manual mode" : "pk_test_xxxxxxxxxxxxxxxx"}
            disabled={manual}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sk">Secret key</Label>
          <Input id="sk" disabled value="" placeholder="Stored securely as a secret — not entered here" />
          <p className="text-xs text-muted-foreground">
            Secret keys are never saved in the database. Ask me to store one and it goes in as{" "}
            <code className="font-mono">
              {config?.secret_key_secret_name ?? "PAYSTACK_SECRET_KEY"}
            </code>
            .
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={liveMode}
            disabled={manual}
            onChange={(e) => setLiveMode(e.target.checked)}
            className="size-4 accent-foreground"
          />
          Live mode (unchecked = test mode)
        </label>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Settlement account, business name, who to contact…"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending || manual}
            onClick={() => save.mutate(!(config?.enabled ?? false))}
          >
            {config?.enabled ? "Disable gateway" : "Enable gateway"}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-xs text-muted-foreground">
        Status:{" "}
        {config?.provider === "manual" || !config?.provider
          ? "Manual mode — no gateway connected"
          : `${config.provider_label || config.provider} · ${config.enabled ? "Enabled" : "Not connected"} · ${
              config.live_mode ? "Live" : "Test"
            } mode`}
      </p>
    </Shell>
  );
}
