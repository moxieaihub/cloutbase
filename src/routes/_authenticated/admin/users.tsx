import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/payout";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "Admin access — Cloutbase admin" },
      {
        name: "description",
        content:
          "Super-admin controls for granting and removing Cloutbase admin access. There is no public admin signup.",
      },
      { property: "og:title", content: "Admin access — Cloutbase admin" },
      {
        property: "og:description",
        content: "Promote a Cloutbase user to admin, or remove their admin access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsers,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading users.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

type UserRow = {
  user_id: string;
  username: string;
  email: string | null;
  roles: string[];
  created_at: string;
};

function AdminUsers() {
  const { isSuperAdmin } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  // Owner admins: emails pre-approved for full dashboard access. Anyone listed
  // here is granted admin + super admin automatically the moment they sign up.
  const { data: owners } = useQuery({
    enabled: isSuperAdmin,
    queryKey: ["owner-admins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_admins")
        .select("id, email, note, created_at")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const addOwner = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase
        .from("owner_admins")
        .insert({ email: value.trim().toLowerCase() });
      if (error) throw error;
      // If the person already has an account, promote them right away.
      await supabase.rpc("super_admin_promote", { _email: value.trim() });
    },
    onSuccess: () => {
      setOwnerEmail("");
      toast.success("Owner admin added");
      queryClient.invalidateQueries({ queryKey: ["owner-admins"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeOwner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("owner_admins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed from the owner list");
      queryClient.invalidateQueries({ queryKey: ["owner-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: users, isLoading } = useQuery({
    enabled: isSuperAdmin,
    queryKey: ["super-admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("super_admin_user_list");
      if (error) throw error;
      return (data ?? []) as UserRow[];
    },
  });

  const promote = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.rpc("super_admin_promote", { _email: value.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setEmail("");
      toast.success("User promoted to admin");
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const demote = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("super_admin_demote", { _user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Admin access removed");
      queryClient.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isSuperAdmin) {
    return (
      <AdminShell>
        <h1 className="text-xl font-semibold tracking-tight">Admin access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only the super admin can promote users to admin.
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Admin access</h1>
      <p className="mt-2 text-xs text-muted-foreground">
        There is no public admin signup. Promote an existing Cloutbase account by email.
      </p>

      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) {
            toast.error("Enter an email");
            return;
          }
          promote.mutate(email);
        }}
      >
        <div>
          <Label htmlFor="promote-email" className="text-xs">
            User email
          </Label>
          <Input
            id="promote-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            className="mt-1"
          />
        </div>
        <Button type="submit" size="sm" disabled={promote.isPending}>
          {promote.isPending ? "Promoting…" : "Promote to admin"}
        </Button>
      </form>

      {/* Owner admins — pre-approved emails, granted admin access on signup. */}
      <h2 className="mt-10 text-sm font-semibold tracking-tight">Owner admins</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Add an email here before the person signs up. The moment they create a Cloutbase account
        they get full dashboard access — no extra step.
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ownerEmail.trim()) {
            toast.error("Enter an email");
            return;
          }
          addOwner.mutate(ownerEmail);
        }}
      >
        <Input
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          placeholder="teammate@example.com"
        />
        <Button type="submit" size="sm" disabled={addOwner.isPending}>
          {addOwner.isPending ? "Adding…" : "Add"}
        </Button>
      </form>
      <ul className="mt-3 space-y-2">
        {(owners ?? []).map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-xs"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{o.email}</p>
              {o.note ? <p className="mt-1 text-muted-foreground">{o.note}</p> : null}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={removeOwner.isPending}
              onClick={() => removeOwner.mutate(o.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-sm font-semibold tracking-tight">Users</h2>
      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(users ?? []).map((u) => (
            <li
              key={u.user_id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{u.username}</p>
                <p className="mt-1 truncate text-muted-foreground">{u.email ?? "—"}</p>
                <p className="mt-1 text-muted-foreground">
                  {u.roles.join(", ") || "no role"} · joined {formatDate(u.created_at)}
                </p>
              </div>
              {u.roles.includes("admin") && !u.roles.includes("super_admin") ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={demote.isPending}
                  onClick={() => demote.mutate(u.user_id)}
                >
                  Remove admin
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
