import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/email")({
  head: () => ({
    meta: [
      { title: "Email Service (Resend or similar) — Cloutbase admin" },
      {
        name: "description",
        content:
          "Connect the external email service Cloutbase uses for campaign approval, rejection and performance report emails.",
      },
      { property: "og:title", content: "Email Service (Resend or similar) — Cloutbase admin" },
      {
        property: "og:description",
        content: "Configure the external email provider used for Cloutbase brand emails.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminEmail,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading email settings.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

function AdminEmail() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    enabled: false,
    provider_name: "",
    endpoint: "",
    from_email: "",
    from_name: "Cloutbase",
    api_key_secret_name: "EMAIL_API_KEY",
    notes: "",
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["email-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_config").select("*").eq("id", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: log } = useQuery({
    queryKey: ["email-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_log")
        .select("id, to_email, subject, kind, status, error, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!config) return;
    setForm({
      enabled: config.enabled,
      provider_name: config.provider_name ?? "",
      endpoint: config.endpoint ?? "",
      from_email: config.from_email ?? "",
      from_name: config.from_name ?? "Cloutbase",
      api_key_secret_name: config.api_key_secret_name ?? "EMAIL_API_KEY",
      notes: config.notes ?? "",
    });
  }, [config]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("email_config")
        .update({
          enabled: form.enabled,
          provider_name: form.provider_name.trim() || null,
          endpoint: form.endpoint.trim() || null,
          from_email: form.from_email.trim() || null,
          from_name: form.from_name.trim() || "Cloutbase",
          api_key_secret_name: form.api_key_secret_name.trim() || "EMAIL_API_KEY",
          notes: form.notes.trim() || null,
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email settings saved");
      queryClient.invalidateQueries({ queryKey: ["email-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Email Service (Resend or similar)</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Cloutbase does not send email itself. Approval, rejection and performance report emails are
        handed to the external provider you configure here. Until it is switched on and reachable,
        every email is written to the log below as “queued” — nothing is faked. The provider’s API
        key is never stored in the database: it lives in a secret, and you only name that secret
        here.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4"
            />
            Sending enabled
          </label>

          <Row
            id="provider"
            label="Provider name"
            placeholder="e.g. Resend, Postmark, Mailgun"
            value={form.provider_name}
            onChange={(v) => setForm({ ...form, provider_name: v })}
          />
          <Row
            id="endpoint"
            label="Send endpoint (HTTPS)"
            placeholder="https://api.provider.com/emails"
            value={form.endpoint}
            onChange={(v) => setForm({ ...form, endpoint: v })}
          />
          <Row
            id="from-email"
            label="From address"
            placeholder="hello@cloutbase.ng"
            value={form.from_email}
            onChange={(v) => setForm({ ...form, from_email: v })}
          />
          <Row
            id="from-name"
            label="From name"
            value={form.from_name}
            onChange={(v) => setForm({ ...form, from_name: v })}
          />
          <Row
            id="secret-name"
            label="API key secret name"
            value={form.api_key_secret_name}
            onChange={(v) => setForm({ ...form, api_key_secret_name: v })}
          />
          <Row
            id="notes"
            label="Notes"
            value={form.notes}
            onChange={(v) => setForm({ ...form, notes: v })}
          />

          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </form>
      )}

      <h2 className="mt-10 text-sm font-semibold tracking-tight">Recent emails</h2>
      {(log ?? []).length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No emails yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(log ?? []).map((e) => (
            <li key={e.id} className="rounded-xl border border-border p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-medium">{e.subject}</p>
                <span className="shrink-0 uppercase tracking-wide text-muted-foreground">
                  {e.status}
                </span>
              </div>
              <p className="mt-1 truncate text-muted-foreground">
                {e.to_email} · {e.kind} · {formatTimestamp(e.created_at)}
              </p>
              {e.error ? <p className="mt-1 text-muted-foreground">{e.error}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function Row({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1"
      />
    </div>
  );
}
