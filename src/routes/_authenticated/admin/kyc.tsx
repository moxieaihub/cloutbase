import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp } from "@/lib/views";

// The KYC functions aren't in the generated Supabase types yet, so we call them untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const queueKey = ["admin-kyc-queue"] as const;

type KycRow = {
  user_id: string;
  real_name: string | null;
  kyc_id_type: string | null;
  kyc_document_path: string | null;
  kyc_submitted_at: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/kyc")({
  head: () => ({
    meta: [
      { title: "KYC review — Cloutbase admin" },
      {
        name: "description",
        content: "Review clipper identity documents and approve or reject them before payouts.",
      },
    ],
  }),
  component: AdminKyc,
  errorComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Something went wrong loading this page.</p>
    </AdminShell>
  ),
  notFoundComponent: () => (
    <AdminShell>
      <p className="text-sm text-muted-foreground">Not found.</p>
    </AdminShell>
  ),
});

function AdminKyc() {
  const { data, isLoading, error } = useQuery({
    queryKey: queueKey,
    queryFn: async () => {
      const { data, error } = await db.rpc("admin_kyc_queue");
      if (error) throw error;
      return (data ?? []) as KycRow[];
    },
    refetchInterval: 30_000,
  });

  return (
    <AdminShell>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">KYC review</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Clippers must be verified before their first payout. Open the ID, check it matches the
          name on their payout details, then approve or reject. Rejections need a reason, which the
          clipper sees in their notifications.
        </p>

        {isLoading ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Couldn't load the queue: {(error as { message?: string }).message ?? "unknown error"}
          </p>
        ) : (data ?? []).length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No IDs waiting for review.
          </p>
        ) : (
          <ul className="mt-8 space-y-4">
            {(data ?? []).map((row) => (
              <KycCard key={row.user_id} row={row} />
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}

function KycCard({ row }: { row: KycRow }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [opening, setOpening] = useState(false);

  // The ID file is in a private bucket, so we open it with a short-lived (2 minute) link.
  async function openDocument() {
    if (!row.kyc_document_path) {
      toast.error("No document on file");
      return;
    }
    setOpening(true);
    // Open the tab first so the browser doesn't block it as a popup, then point it at the file.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(row.kyc_document_path, 120);
    setOpening(false);
    if (error || !data?.signedUrl) {
      tab?.close();
      toast.error(error?.message ?? "Could not open the document");
      return;
    }
    if (tab) tab.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  }

  const review = useMutation({
    mutationFn: async (approve: boolean) => {
      const { error } = await db.rpc("admin_review_kyc", {
        _clipper_user_id: row.user_id,
        _approve: approve,
        _note: approve ? null : note.trim(),
      });
      if (error) throw error;
      return approve;
    },
    onSuccess: (approve) => {
      toast.success(approve ? "KYC approved. The clipper has been notified." : "KYC rejected. The clipper has been notified.");
      queryClient.invalidateQueries({ queryKey: queueKey });
    },
    onError: (e: { message?: string }) => toast.error(e.message ?? "Something went wrong"),
  });

  function approve() {
    if (!window.confirm("Approve this ID? The clipper will be cleared for payouts.")) return;
    review.mutate(true);
  }

  function reject() {
    if (note.trim() === "") {
      toast.error("Give a reason when rejecting");
      return;
    }
    review.mutate(false);
  }

  return (
    <li className="rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-tight">
            {row.real_name?.trim() || "Name not set"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.kyc_id_type ?? "ID type not given"}
            {row.kyc_submitted_at ? ` · submitted ${formatTimestamp(row.kyc_submitted_at)}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">User {row.user_id.slice(0, 8)}…</p>
        </div>
        <Button size="sm" variant="outline" onClick={openDocument} disabled={opening}>
          {opening ? "Opening…" : "View ID"}
        </Button>
      </div>

      <div className="mt-4">
        <label htmlFor={`kyc-note-${row.user_id}`} className="text-xs text-muted-foreground">
          Reason (required only if you reject)
        </label>
        <Textarea
          id={`kyc-note-${row.user_id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Photo is blurry, please upload a clearer picture of the ID"
          className="mt-1.5"
          rows={2}
        />
      </div>

      <div className="mt-4 flex gap-3">
        <Button onClick={approve} disabled={review.isPending}>
          Approve
        </Button>
        <Button variant="outline" onClick={reject} disabled={review.isPending}>
          Reject
        </Button>
      </div>
    </li>
  );
}
