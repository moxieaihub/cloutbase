import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { OfficialBadge } from "@/components/OfficialBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipperShell } from "@/features/clipper/components/ClipperShell";
import { useApplyOfficial, useClipperProfile } from "@/features/clipper/queries";
import { MIN_FOLLOWERS_TO_APPLY, PERKS, formatFollowers } from "@/lib/inhouse";

export const Route = createFileRoute("/_authenticated/clipper/official")({
  head: () => ({
    meta: [
      { title: "Official Clipper — Cloutbase" },
      { name: "description", content: "Apply to become an Official Cloutbase Clipper." },
    ],
  }),
  component: OfficialPage,
});

type Initial = {
  followers_count: number | null;
  avg_views: number | null;
  whatsapp: string | null;
  applied_at: string | null;
  reject_reason: string | null;
} | null;

function OfficialPage() {
  const { user } = Route.useRouteContext();
  const { data: profile, isLoading } = useClipperProfile(user.id);

  return (
    <ClipperShell>
      <p className="text-sm text-muted-foreground">Official Clipper programme</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
        Top clippers are earning <span className="text-price">₦120k+</span> a month
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Same pay-per-view rate as everyone — views are the equaliser. Official Clippers just get in earlier, post
        more, and hear about campaigns first.
      </p>

      <div className="mt-6 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10">
        <section className="grid gap-3 md:grid-cols-2">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-border p-5">
              <p className="text-sm font-medium">{p.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-2xl border border-border p-5 lg:mt-0">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Apply</h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          ) : profile?.is_approved ? (
            <div className="mt-4 rounded-xl border border-foreground p-4">
              <OfficialBadge />
              <p className="mt-3 text-sm">You’re an Official Cloutbase Clipper.</p>
            </div>
          ) : (
            <ApplyForm key={profile ? "loaded" : "empty"} userId={user.id} initial={(profile as Initial) ?? null} />
          )}
        </section>
      </div>
    </ClipperShell>
  );
}

function ApplyForm({ userId, initial }: { userId: string; initial: Initial }) {
  const apply = useApplyOfficial(userId);
  const [followers, setFollowers] = useState(initial?.followers_count ? String(initial.followers_count) : "");
  const [avgViews, setAvgViews] = useState(initial?.avg_views ? String(initial.avg_views) : "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");

  const followerCount = Number(followers.replace(/\D/g, "") || 0);
  const viewsCount = Number(avgViews.replace(/\D/g, "") || 0);
  const eligible = followerCount >= MIN_FOLLOWERS_TO_APPLY;
  const complete = eligible && viewsCount > 0 && whatsapp.trim().length >= 7;

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply.mutate({ followers: followerCount, avgViews: viewsCount, whatsapp });
      }}
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        Minimum {formatFollowers(MIN_FOLLOWERS_TO_APPLY)} followers on your main clipping account. Public campaigns
        have no follower gate — this is only for the Official programme.
      </p>

      {initial?.applied_at && !initial.reject_reason ? (
        <p className="rounded-xl border border-border p-4 text-xs leading-relaxed text-muted-foreground">
          Your application is in the admin review queue. You can update your numbers and resubmit.
        </p>
      ) : null}
      {initial?.reject_reason ? (
        <p className="rounded-xl border border-foreground p-4 text-xs leading-relaxed">
          <span className="font-medium">Not approved:</span> {initial.reject_reason}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="of-followers">Follower count (main account)</Label>
        <Input
          id="of-followers"
          inputMode="numeric"
          value={followers}
          onChange={(e) => setFollowers(e.target.value.replace(/\D/g, "").slice(0, 9))}
          placeholder="5000"
        />
        {followers && !eligible ? (
          <p className="text-xs">You need at least {formatFollowers(MIN_FOLLOWERS_TO_APPLY)} followers to apply.</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="of-views">Average monthly views</Label>
        <Input
          id="of-views"
          inputMode="numeric"
          value={avgViews}
          onChange={(e) => setAvgViews(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="250000"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="of-wa">WhatsApp contact</Label>
        <Input id="of-wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 800 000 0000" />
      </div>

      <Button type="submit" className="w-full" disabled={!complete || apply.isPending}>
        {apply.isPending ? "Sending…" : initial?.applied_at ? "Resubmit application" : "Send application"}
      </Button>
      {!complete ? (
        <p className="text-center text-xs text-muted-foreground">
          All three fields are required, with {formatFollowers(MIN_FOLLOWERS_TO_APPLY)}+ followers.
        </p>
      ) : null}
    </form>
  );
}
