import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/bans")({
  head: () => ({
    meta: [
      { title: "Bans & strikes — Cloutbase admin" },
      {
        name: "description",
        content:
          "Ban and strike log for Cloutbase clippers, plus the register that blocks banned identities from re-registering.",
      },
      { property: "og:title", content: "Bans & strikes — Cloutbase admin" },
      { property: "og:description", content: "Ban register and strike history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminBans,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading the ban log.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

function AdminBans() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: log } = useQuery({
    queryKey: ["admin-ban-log"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_ban_log");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: register } = useQuery({
    queryKey: ["banned-identities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banned_identities")
        .select("id, email, username, device_signal, reason, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clippers } = useQuery({
    queryKey: ["admin-clipper-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_clipper_applications");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-ban-log"] });
    queryClient.invalidateQueries({ queryKey: ["banned-identities"] });
    queryClient.invalidateQueries({ queryKey: ["admin-clipper-applications"] });
  };

  const ban = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc("admin_ban_clipper", { _user_id: userId, _reason: reason });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clipper banned — identity added to the register");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unban = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_unban_clipper", {
        _user_id: userId,
        _reason: "Reinstated by admin",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Clipper reinstated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const strike = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc("admin_add_strike", { _user_id: userId, _reason: reason });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Strike added");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const people = (clippers ?? []).filter(
    (c) =>
      term === "" ||
      (c.username ?? "").toLowerCase().includes(term) ||
      (c.email ?? "").toLowerCase().includes(term),
  );

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Bans &amp; strikes</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Banning a clipper releases their slots, blocks payouts and adds their email, username and
        device signal to the register — so the same person cannot sign up again.
      </p>

      <Input
        placeholder="Search clippers by username or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-5"
      />

      <ul className="mt-4 space-y-2">
        {people.map((c) => (
          <li key={c.user_id} className="rounded-xl border border-border p-3 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">@{c.username}</p>
                <p className="truncate text-muted-foreground">{c.email}</p>
              </div>
              <span className="shrink-0 uppercase tracking-wide text-muted-foreground">
                {c.banned ? "Banned" : `${c.strikes ?? 0} strikes`}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.banned ? (
                <Button size="sm" variant="outline" onClick={() => unban.mutate(c.user_id)}>
                  Unban
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const reason = window.prompt("Strike reason");
                      if (reason?.trim()) strike.mutate({ userId: c.user_id, reason: reason.trim() });
                    }}
                  >
                    Add strike
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const reason = window.prompt("Ban reason (fake views, bots, multi-accounting…)");
                      if (reason?.trim()) ban.mutate({ userId: c.user_id, reason: reason.trim() });
                    }}
                  >
                    Ban permanently
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
        {people.length === 0 ? (
          <li className="text-xs text-muted-foreground">No clippers match.</li>
        ) : null}
      </ul>

      <h2 className="mt-10 text-sm font-semibold tracking-tight">Ban register</h2>
      {(register ?? []).length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Nobody is banned.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(register ?? []).map((b) => (
            <li key={b.id} className="rounded-xl border border-border p-3 text-xs">
              <p className="font-medium">@{b.username ?? "—"}</p>
              <p className="truncate text-muted-foreground">
                {b.email ?? "—"} · signal {b.device_signal ?? "—"}
              </p>
              <p className="mt-1 text-muted-foreground">{b.reason}</p>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-sm font-semibold tracking-tight">History</h2>
      {(log ?? []).length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No strikes or bans yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(log ?? []).map((row, i) => (
            <li key={`${row.user_id}-${i}`} className="rounded-xl border border-border p-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <p className="truncate font-medium">@{row.username}</p>
                <span className="shrink-0 uppercase tracking-wide text-muted-foreground">
                  {row.kind}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{row.reason}</p>
              <p className="mt-1 text-muted-foreground">{formatTimestamp(row.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
