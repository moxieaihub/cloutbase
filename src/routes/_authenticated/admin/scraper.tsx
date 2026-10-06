import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/scraper")({
  head: () => ({
    meta: [
      { title: "View Scraper API — Cloutbase admin" },
      {
        name: "description",
        content:
          "Configure the external View Scraper API used to pull TikTok, Instagram and YouTube view counts.",
      },
      { property: "og:title", content: "View Scraper API — Cloutbase admin" },
      {
        property: "og:description",
        content: "Endpoint and API key configuration for automated view tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScraperConfig,
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
        <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </Link>
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function ScraperConfig() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const [endpoint, setEndpoint] = useState("");
  const [provider, setProvider] = useState("");
  const [notes, setNotes] = useState("");

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    },
  });

  const { data: config } = useQuery({
    enabled: isAdmin === true,
    queryKey: ["scraper-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("view_scraper_config")
        .select("enabled, endpoint, provider_name, api_key_secret_name, notes, updated_at")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!config) return;
    setEndpoint(config.endpoint ?? "");
    setProvider(config.provider_name ?? "");
    setNotes(config.notes ?? "");
  }, [config]);

  const save = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("view_scraper_config")
        .update({
          endpoint: endpoint.trim() || null,
          provider_name: provider.trim() || null,
          notes: notes.trim() || null,
          enabled,
        })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("View Scraper API config saved");
      queryClient.invalidateQueries({ queryKey: ["scraper-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (roleLoading) return <Shell><p className="text-sm text-muted-foreground">Loading…</p></Shell>;
  if (!isAdmin)
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">This area is for Cloutbase admins only.</p>
      </Shell>
    );

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">View Scraper API</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Placeholder — not connected. Pulling real TikTok, Instagram and YouTube view counts needs
        an external scraping service. No numbers are ever generated or estimated by Cloutbase.
        Until you plug a provider in here, admins record view counts manually on the view tracking
        page.
      </p>

      <div className="mt-5 rounded-xl border border-border p-4 text-xs leading-relaxed">
        <p className="font-medium">When you're ready, I'll need:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
          <li>The provider name (e.g. Apify, ScrapeCreators, RapidAPI endpoint).</li>
          <li>The API endpoint URL — enter it below.</li>
          <li>
            The API key — tell me and I'll store it securely as{" "}
            <span className="text-foreground">
              {config?.api_key_secret_name ?? "VIEW_SCRAPER_API_KEY"}
            </span>
            . Never paste keys into these fields.
          </li>
        </ol>
      </div>

      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(config?.enabled ?? false);
        }}
      >
        <div>
          <Label htmlFor="provider">Provider name</Label>
          <Input
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Not configured"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="endpoint">API endpoint</Label>
          <Input
            id="endpoint"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.provider.com/v1/views"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Rate limits, supported platforms…"
            className="mt-1"
          />
        </div>

        <div className="rounded-xl border border-border p-4 text-xs">
          <p className="text-muted-foreground">Status</p>
          <p className="mt-1">
            {config?.enabled ? "Enabled" : "Not connected — manual entry fallback in use"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save config"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => save.mutate(!(config?.enabled ?? false))}
          >
            {config?.enabled ? "Disable" : "Mark as connected"}
          </Button>
        </div>
      </form>
    </Shell>
  );
}
