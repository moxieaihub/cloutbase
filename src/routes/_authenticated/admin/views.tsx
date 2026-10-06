import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/campaign";
import {
  formatTimestamp,
  formatViews,
  snapshotState,
  VIEW_SOURCE_LABELS,
  type ViewSource,
} from "@/lib/views";

export const Route = createFileRoute("/_authenticated/admin/views")({
  head: () => ({
    meta: [
      { title: "View tracking — Cloutbase admin" },
      {
        name: "description",
        content:
          "Record and audit clip view counts, check the 5-day snapshot state of every submitted clip.",
      },
      { property: "og:title", content: "View tracking — Cloutbase admin" },
      {
        property: "og:description",
        content: "Admin view tracking and reading log for Cloutbase clip submissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminViews,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Something went wrong loading view tracking.</p>
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link to="/admin/payouts" className="hover:text-foreground">
            Payouts
          </Link>
          <Link to="/admin/scraper" className="hover:text-foreground">
            View Scraper API
          </Link>
        </div>
      </header>
      <div className="mt-8">{children}</div>
    </main>
  );
}

type ClipRow = {
  id: string;
  clip_link: string;
  platform: string;
  view_count: number;
  earnings: number;
  posted_at: string;
  counts_from: string | null;
  is_live: boolean;
  deleted_before_snapshot: boolean;
  snapshot_view_count: number | null;
  snapshot_taken_at: string | null;
  last_checked_at: string | null;
  clipper_user_id: string;
  campaigns: { title: string } | null;
};

function AdminViews() {
  const { user } = Route.useRouteContext();

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

  const { data: clips, isLoading } = useQuery({
    enabled: isAdmin === true,
    queryKey: ["admin-clips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_submissions")
        .select(
          "id, clip_link, platform, view_count, earnings, posted_at, counts_from, is_live, deleted_before_snapshot, snapshot_view_count, snapshot_taken_at, last_checked_at, clipper_user_id, campaigns(title)",
        )
        .order("submitted_at", { ascending: false })
        .returns<ClipRow[]>();
      if (error) throw error;
      return data ?? [];
    },
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
      <h1 className="text-xl font-semibold tracking-tight">View tracking</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Automated scraping is not connected yet — enter counts manually below. Every reading is
        timestamped and logged. A clip must stay live 5 days; views are counted at the snapshot
        after that, and a clip deleted before its snapshot earns nothing.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading clips…</p>
      ) : (clips ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No clips submitted yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {(clips ?? []).map((c) => (
            <ClipCard key={c.id} clip={c} adminId={user.id} />
          ))}
        </ul>
      )}
    </Shell>
  );
}

function ClipCard({ clip, adminId }: { clip: ClipRow; adminId: string }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [showLog, setShowLog] = useState(false);
  const state = snapshotState(clip);

  const { data: readings } = useQuery({
    enabled: showLog,
    queryKey: ["clip-readings", clip.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_view_readings")
        .select("id, view_count, source, is_live, note, recorded_at")
        .eq("clip_submission_id", clip.id)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const record = useMutation({
    mutationFn: async (opts: { views: number; isLive: boolean }) => {
      const { error: readingError } = await supabase.from("clip_view_readings").insert({
        clip_submission_id: clip.id,
        view_count: opts.views,
        source: "manual" satisfies ViewSource,
        is_live: opts.isLive,
        recorded_by: adminId,
        note: note.trim() || null,
      });
      if (readingError) throw readingError;

      const { error } = await supabase
        .from("clip_submissions")
        .update({ view_count: opts.views, is_live: opts.isLive })
        .eq("id", clip.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setValue("");
      setNote("");
      toast.success("Reading logged");
      queryClient.invalidateQueries({ queryKey: ["admin-clips"] });
      queryClient.invalidateQueries({ queryKey: ["clip-readings", clip.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <li className="rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{clip.campaigns?.title ?? "Campaign"}</p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">{clip.platform}</p>
        </div>
        <span className="text-sm text-money">{formatNaira(Number(clip.earnings ?? 0))}</span>
      </div>

      <a
        href={clip.clip_link}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 block break-all text-xs underline underline-offset-4"
      >
        {clip.clip_link}
      </a>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Current views</p>
          <p className="mt-1 text-base font-semibold">{formatViews(clip.view_count)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Snapshot views</p>
          <p className="mt-1 text-base font-semibold">
            {clip.snapshot_view_count === null ? "—" : formatViews(clip.snapshot_view_count)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className="mt-1">{state.label}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Last reading</p>
          <p className="mt-1">{formatTimestamp(clip.last_checked_at)}</p>
        </div>
      </div>

      <form
        className="mt-4 space-y-3 border-t border-border pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const views = Number(value);
          if (!Number.isFinite(views) || views < 0) {
            toast.error("Enter a valid view count");
            return;
          }
          record.mutate({ views: Math.floor(views), isLive: true });
        }}
      >
        <div>
          <Label htmlFor={`views-${clip.id}`} className="text-xs">
            Manual view count
          </Label>
          <Input
            id={`views-${clip.id}`}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 12400"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor={`note-${clip.id}`} className="text-xs">
            Note (optional)
          </Label>
          <Input
            id={`note-${clip.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Spot-checked on TikTok"
            className="mt-1"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={record.isPending}>
            {record.isPending ? "Saving…" : "Log reading"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={record.isPending}
            onClick={() => record.mutate({ views: clip.view_count, isLive: false })}
          >
            Mark clip deleted
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowLog((s) => !s)}
          >
            {showLog ? "Hide log" : "Reading log"}
          </Button>
        </div>
      </form>

      {showLog ? (
        <ul className="mt-4 space-y-2 border-t border-border pt-4">
          {(readings ?? []).length === 0 ? (
            <li className="text-xs text-muted-foreground">No readings logged yet.</li>
          ) : (
            (readings ?? []).map((r) => (
              <li key={r.id} className="text-xs text-muted-foreground">
                <span className="text-foreground">{formatViews(r.view_count)} views</span> ·{" "}
                {VIEW_SOURCE_LABELS[(r.source as ViewSource) ?? "manual"] ?? r.source} ·{" "}
                {formatTimestamp(r.recorded_at)}
                {r.is_live ? "" : " · reported down"}
                {r.note ? ` · ${r.note}` : ""}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </li>
  );
}
