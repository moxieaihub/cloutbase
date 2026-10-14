import { createFileRoute } from "@tanstack/react-router";

import { AdminShell } from "@/components/AdminShell";
import { ApplicationCard } from "@/features/admin/components/ApplicationCard";
import { useSlotApplications } from "@/features/admin/queries";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  head: () => ({
    meta: [
      { title: "Slot applications — Cloutbase admin" },
      { name: "description", content: "Check clippers out and accept them into campaigns." },
    ],
  }),
  component: Applications,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading applications.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

function Applications() {
  const { data, isLoading } = useSlotApplications();
  const list = data ?? [];

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Slot applications</h1>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        Clippers who want to join a live campaign. Judge them on average views and strikes, then accept
        them into the campaign or decline with a reason. Oldest first.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No one is waiting. You’re all caught up.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {list.map((a) => (
            <ApplicationCard key={a.application_id} app={a} />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
