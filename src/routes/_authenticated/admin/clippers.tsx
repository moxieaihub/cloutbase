import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AdminShell } from "@/components/AdminShell";
import { OfficialBadge } from "@/components/OfficialBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_RATE_PER_1000_VIEWS,
  KPI_TARGETS,
  ceilingFromBudget,
  formatNaira,
} from "@/lib/campaign";
import { MIN_FOLLOWERS_TO_APPLY, OFFICIAL_MAX_CLIPS_PER_DAY, formatFollowers } from "@/lib/inhouse";

export const Route = createFileRoute("/_authenticated/admin/clippers")({
  head: () => ({
    meta: [
      { title: "Official Clippers — Cloutbase admin" },
      {
        name: "description",
        content:
          "Approve Official Clipper applications, set the Cloutbase watermark and launch in-house campaigns.",
      },
      { property: "og:title", content: "Official Clippers — Cloutbase admin" },
      {
        property: "og:description",
        content: "Application queue, Cloutbase watermark and in-house campaign creation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminClippers,
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

function AdminClippers() {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admin-clipper-applications"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_clipper_applications");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: config } = useQuery({
    queryKey: ["inhouse-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inhouse_config")
        .select("watermark_url, min_followers, priority_group_link, notes")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const approve = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_approve_clipper", {
        _user_id: userId,
        _max_clips_per_day: OFFICIAL_MAX_CLIPS_PER_DAY,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Approved — Official Clipper perks unlocked");
      queryClient.invalidateQueries({ queryKey: ["admin-clipper-applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase.rpc("admin_reject_clipper", {
        _user_id: userId,
        _reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-clipper-applications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = (applications ?? []).filter((a) => !a.is_approved && !a.reject_reason);
  const decided = (applications ?? []).filter((a) => a.is_approved || a.reject_reason);

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold tracking-tight">Official Clippers</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Approving a clipper sets them in-house and priority: early campaign access, up to{" "}
        {OFFICIAL_MAX_CLIPS_PER_DAY} clips a day, the Official badge and the priority group. The
        pay-per-view rate never changes — it's identical for every clipper.
      </p>

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Application queue ({pending.length})
      </h2>
      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          No applications waiting.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {pending.map((a) => (
            <ApplicationCard
              key={a.user_id}
              app={a}
              onApprove={() => approve.mutate(a.user_id)}
              onReject={(reason) => reject.mutate({ userId: a.user_id, reason })}
              busy={approve.isPending || reject.isPending}
            />
          ))}
        </ul>
      )}

      {decided.length > 0 ? (
        <>
          <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Decided
          </h2>
          <ul className="mt-4 space-y-3">
            {decided.map((a) => (
              <li
                key={a.user_id}
                className="flex items-center justify-between rounded-xl border border-border p-4 text-sm"
              >
                <div>
                  <p className="font-medium">@{a.username}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFollowers(a.followers_count)} followers ·{" "}
                    {formatFollowers(a.avg_views)} avg views
                    {a.reject_reason ? ` · Rejected: ${a.reject_reason}` : ""}
                  </p>
                </div>
                {a.is_approved ? (
                  <OfficialBadge />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => approve.mutate(a.user_id)}
                    disabled={approve.isPending}
                  >
                    Approve
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <WatermarkBox currentPath={config?.watermark_url ?? null} />
      <WatermarkQueue />
      <InhouseCampaignForm defaultMinFollowers={config?.min_followers ?? MIN_FOLLOWERS_TO_APPLY} />

    </AdminShell>
  );
}

type App = {
  user_id: string;
  username: string;
  email: string | null;
  followers_count: number;
  avg_views: number;
  whatsapp: string | null;
  applied_at: string | null;
};

function ApplicationCard({
  app,
  onApprove,
  onReject,
  busy,
}: {
  app: App;
  onApprove: () => void;
  onReject: (reason: string) => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  return (
    <li className="rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">@{app.username}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{app.email}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {app.applied_at ? new Date(app.applied_at).toLocaleDateString("en-NG") : ""}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Followers</dt>
          <dd className="mt-0.5">{formatFollowers(app.followers_count)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Avg monthly views</dt>
          <dd className="mt-0.5">{formatFollowers(app.avg_views)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">WhatsApp</dt>
          <dd className="mt-0.5 break-words">{app.whatsapp ?? "—"}</dd>
        </div>
      </dl>

      {app.followers_count < MIN_FOLLOWERS_TO_APPLY ? (
        <p className="mt-3 text-xs">Below the {formatFollowers(MIN_FOLLOWERS_TO_APPLY)} minimum.</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onApprove} disabled={busy}>
          Approve as Official Clipper
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRejecting((r) => !r)}
          disabled={busy}
        >
          Reject
        </Button>
      </div>

      {rejecting ? (
        <div className="mt-3 flex gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (sent to the clipper)"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!reason.trim() || busy}
            onClick={() => onReject(reason.trim())}
          >
            Send
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function WatermarkBox({ currentPath }: { currentPath: string | null }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentPath) {
        setPreview(null);
        return;
      }
      const { data } = await supabase.storage
        .from("campaign-assets")
        .createSignedUrl(currentPath, 3600);
      if (!cancelled) setPreview(data?.signedUrl ?? null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [currentPath]);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose an image first");
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${uid}/cloutbase-watermark-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("campaign-assets")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("inhouse_config")
        .update({ watermark_url: path })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      setFile(null);
      toast.success("Cloutbase watermark saved — applied to in-house clips");
      queryClient.invalidateQueries({ queryKey: ["inhouse-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-12 rounded-2xl border border-border p-5">
      <h2 className="text-sm font-medium">Upload Cloutbase watermark</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Required on every in-house clip. Clippers see it in the brief of any in-house campaign.
      </p>

      {preview ? (
        <img
          src={preview}
          alt="Current Cloutbase watermark"
          className="mt-4 h-20 w-auto rounded-lg border border-border bg-secondary object-contain p-2"
        />
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No watermark uploaded yet.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          type="file"
          accept="image/*"
          className="max-w-xs"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button size="sm" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
          {upload.isPending ? "Uploading…" : "Save watermark"}
        </Button>
      </div>
    </section>
  );
}

function InhouseCampaignForm({ defaultMinFollowers }: { defaultMinFollowers: number }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [videoLength, setVideoLength] = useState("");
  const [budget, setBudget] = useState("200000");
  const [slots, setSlots] = useState("20");
  const [durationDays, setDurationDays] = useState("7");
  const [kpi, setKpi] = useState<string>(KPI_TARGETS[4]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [brandTag, setBrandTag] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [minFollowers, setMinFollowers] = useState(String(defaultMinFollowers));

  const budgetNum = Number(budget || 0);
  const slotsNum = Number(slots || 0);
  const ceiling = slotsNum > 0 ? ceilingFromBudget(budgetNum, slotsNum) : 0;

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("admin_create_inhouse_campaign", {
        _title: title.trim(),
        _source_file_link: sourceLink.trim(),
        _video_length_minutes: Number(videoLength || 0),
        _budget: budgetNum,
        _slots: slotsNum,
        _rate_per_1000_views: DEFAULT_RATE_PER_1000_VIEWS,
        _duration_days: Number(durationDays || 7),
        _kpi_target: kpi,
        _caption: caption.trim(),
        _hashtags: hashtags.trim(),
        _brand_tag: brandTag.trim(),
        _cta_link: ctaLink.trim(),
        _min_followers: Number(minFollowers || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setSourceLink("");
      setCaption("");
      toast.success("In-house campaign is live for Official Clippers");
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-8 rounded-2xl border border-border p-5">
      <h2 className="text-sm font-medium">Create in-house campaign</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Only approved Official Clippers meeting the follower requirement can see or join it. Clips
        must carry the Cloutbase watermark above.
      </p>

      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div>
          <Label htmlFor="ih-title">Title</Label>
          <Input id="ih-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="ih-source">Promo video link (Drive or direct)</Label>
          <Input
            id="ih-source"
            value={sourceLink}
            onChange={(e) => setSourceLink(e.target.value)}
            placeholder="https://drive.google.com/…"
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ih-length">Video length (min)</Label>
            <Input
              id="ih-length"
              inputMode="decimal"
              value={videoLength}
              onChange={(e) => setVideoLength(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ih-budget">Budget (₦)</Label>
            <Input
              id="ih-budget"
              inputMode="numeric"
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ih-slots">Slots</Label>
            <Input
              id="ih-slots"
              inputMode="numeric"
              value={slots}
              onChange={(e) => setSlots(e.target.value.replace(/\D/g, ""))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ih-days">Duration (days)</Label>
            <Input
              id="ih-days"
              inputMode="numeric"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value.replace(/\D/g, ""))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ih-minfollowers">Minimum followers</Label>
            <Input
              id="ih-minfollowers"
              inputMode="numeric"
              value={minFollowers}
              onChange={(e) => setMinFollowers(e.target.value.replace(/\D/g, ""))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ih-kpi">KPI target</Label>
            <Select value={kpi} onValueChange={setKpi}>
              <SelectTrigger id="ih-kpi" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KPI_TARGETS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="ih-caption">Exact caption</Label>
          <Input id="ih-caption" value={caption} onChange={(e) => setCaption(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="ih-hashtags">Hashtags</Label>
          <Input id="ih-hashtags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ih-tag">Brand tag</Label>
            <Input id="ih-tag" value={brandTag} onChange={(e) => setBrandTag(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ih-cta">CTA link</Label>
            <Input id="ih-cta" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} className="mt-1" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Clippers will see{" "}
          <span className="text-money">Earn up to {formatNaira(ceiling)}</span> at{" "}
          {formatNaira(DEFAULT_RATE_PER_1000_VIEWS)} per 1,000 views — the same rate as public
          campaigns.
        </p>

        <Button type="submit" disabled={!title.trim() || create.isPending}>
          {create.isPending ? "Creating…" : "Create in-house campaign"}
        </Button>
      </form>
    </section>
  );
}

function WatermarkQueue() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: clips } = useQuery({
    queryKey: ["inhouse-clip-queue"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_inhouse_clip_queue");
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, ok }: { id: string; ok: boolean }) => {
      const note = notes[id]?.trim();
      const { error } = await supabase.rpc("admin_set_clip_watermark", {
        _clip_id: id,
        _ok: ok,
        ...(note ? { _note: note } : {}),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Watermark decision saved.");
      queryClient.invalidateQueries({ queryKey: ["inhouse-clip-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mt-12 rounded-2xl border border-border p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        In-house watermark checks
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Every in-house clip lands here. Open the link, confirm the Cloutbase watermark is on the
        video. A rejected clip earns nothing and the clipper is notified.
      </p>

      {clips && clips.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {clips.map((c) => (
            <li key={c.id} className="rounded-xl border border-border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">@{c.username}</span>
                <span className="text-xs text-muted-foreground capitalize">{c.platform}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.campaign_title}</p>
              <a
                href={c.clip_link}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-1 block truncate text-xs underline underline-offset-4"
              >
                {c.clip_link}
              </a>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {c.watermark_verified === true
                  ? "Verified"
                  : c.watermark_verified === false
                    ? `Rejected${c.watermark_note ? ` — ${c.watermark_note}` : ""}`
                    : c.watermark_confirmed
                      ? "Clipper confirmed — awaiting your check"
                      : "Not confirmed"}
              </p>
              {c.watermark_verified === null ? (
                <>
                  <Input
                    value={notes[c.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                    placeholder="Note (optional)"
                    className="mt-2"
                  />
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ id: c.id, ok: true })}
                    >
                      Watermark present
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ id: c.id, ok: false })}
                    >
                      Missing — reject
                    </Button>
                  </div>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No in-house clips submitted yet.</p>
      )}
    </section>
  );
}
