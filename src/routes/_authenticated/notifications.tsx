import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp } from "@/lib/views";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Cloutbase" },
      {
        name: "description",
        content:
          "New campaign alerts, 72-hour slot warnings and Naira payout alerts for your Cloutbase account.",
      },
      { property: "og:title", content: "Notifications — Cloutbase" },
      {
        property: "og:description",
        content: "Campaign alerts, slot warnings and payout alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Something went wrong loading notifications.</p>
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <Link to="/clipper" className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </Link>
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function Notifications() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, message, type, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
  });

  const unread = (items ?? []).filter((n) => !n.read).length;

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        New campaign alerts (Official Clippers first), 72-hour slot warnings and payout alerts.
      </p>

      {unread > 0 ? (
        <Button size="sm" variant="outline" className="mt-4" onClick={() => markRead.mutate()}>
          Mark all read ({unread})
        </Button>
      ) : null}

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : (items ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {(items ?? []).map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-3 text-sm ${n.read ? "border-border text-muted-foreground" : "border-foreground"}`}
            >
              <p>{n.message}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {n.type} · {formatTimestamp(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
