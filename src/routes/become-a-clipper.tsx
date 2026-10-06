import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { CommunityLinks } from "@/components/CommunityLinks";
import { Logo } from "@/components/Logo";
import { OfficialBadge } from "@/components/OfficialBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { MIN_FOLLOWERS_TO_APPLY, PERKS, formatFollowers } from "@/lib/inhouse";

export const Route = createFileRoute("/become-a-clipper")({
  head: () => ({
    meta: [
      { title: "Become an Official Cloutbase Clipper" },
      {
        name: "description",
        content:
          "Top Cloutbase clippers earn ₦120k+/month. Apply with 5,000+ followers for early campaign access, higher daily clip limits and the priority group.",
      },
      { property: "og:title", content: "Become an Official Cloutbase Clipper" },
      {
        property: "og:description",
        content:
          "Early access to campaigns, higher daily clip limits, a priority group and an official badge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Recruit,
  errorComponent: () => (
    <Shell>
      <p className="text-sm text-muted-foreground">Something went wrong. Reload the page.</p>
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
        <Link to="/">
          <Logo size="sm" />
        </Link>
        <Link
          to="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Log in
        </Link>
      </header>
      {children}
    </main>
  );
}

function Recruit() {
  const queryClient = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
  });

  const { data: me } = useQuery({
    enabled: !!session,
    queryKey: ["recruit-profile", session?.id],
    queryFn: async () => {
      const [{ data: profile }, { data: clipper }] = await Promise.all([
        supabase.from("profiles").select("account_type").eq("id", session!.id).maybeSingle(),
        supabase
          .from("clipper_profiles")
          .select("followers_count, avg_views, whatsapp, applied_at, is_approved, reject_reason")
          .eq("user_id", session!.id)
          .maybeSingle(),
      ]);
      return { accountType: profile?.account_type ?? null, clipper };
    },
  });

  const [followers, setFollowers] = useState("");
  const [avgViews, setAvgViews] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    const c = me?.clipper;
    if (!c) return;
    if (c.followers_count) setFollowers(String(c.followers_count));
    if (c.avg_views) setAvgViews(String(c.avg_views));
    if (c.whatsapp) setWhatsapp(c.whatsapp);
  }, [me]);

  const followerCount = Number(followers.replace(/\D/g, "") || 0);
  const viewsCount = Number(avgViews.replace(/\D/g, "") || 0);
  const eligible = followerCount >= MIN_FOLLOWERS_TO_APPLY;
  const complete = eligible && viewsCount > 0 && whatsapp.trim().length >= 7;

  const apply = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("apply_inhouse_clipper", {
        _followers: followerCount,
        _avg_views: viewsCount,
        _whatsapp: whatsapp.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application sent — a Cloutbase admin will review it.");
      queryClient.invalidateQueries({ queryKey: ["recruit-profile", session?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clipper = me?.clipper;
  const isClipperAccount = me?.accountType === "clipper";

  return (
    <Shell>
      <section className="mt-12">
        <p className="text-sm text-muted-foreground">Official Clipper programme</p>
        <h1 className="mt-2 text-[2rem] font-semibold leading-[1.15] tracking-tight">
          Top clippers are earning{" "}
          <span className="text-money">₦120k+</span> a month
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Same pay-per-view rate as everyone — views are the equaliser. Official Clippers just get
          in earlier, post more, and hear about campaigns first.
        </p>
      </section>

      <section className="mt-10 space-y-3">
        {PERKS.map((p) => (
          <div key={p.title} className="rounded-2xl border border-border p-5">
            <p className="text-sm font-medium">{p.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Apply
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Minimum {formatFollowers(MIN_FOLLOWERS_TO_APPLY)} followers on your main clipping
          account. Public campaigns have no follower gate — this is only for the Official
          programme.
        </p>

        {sessionLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : !session ? (
          <div className="mt-6 space-y-3">
            <Link
              to="/signup/$type"
              params={{ type: "clipper" }}
              className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-foreground px-6 text-base font-semibold text-background transition-opacity hover:opacity-90"
            >
              Create a clipper account to apply
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              Already have one?{" "}
              <Link to="/login" className="underline underline-offset-4">
                Log in
              </Link>
            </p>
          </div>
        ) : !isClipperAccount ? (
          <p className="mt-6 rounded-2xl border border-border p-5 text-sm text-muted-foreground">
            You're signed in with a business account. The Official Clipper programme is for clipper
            accounts only.
          </p>
        ) : clipper?.is_approved ? (
          <div className="mt-6 rounded-2xl border border-foreground p-5">
            <OfficialBadge />
            <p className="mt-3 text-sm">You're an Official Cloutbase Clipper.</p>
            <Link
              to="/clipper"
              className="mt-3 inline-block text-xs underline underline-offset-4"
            >
              Go to your campaigns →
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              apply.mutate();
            }}
          >
            {clipper?.applied_at && !clipper?.reject_reason ? (
              <p className="rounded-xl border border-border p-4 text-xs leading-relaxed text-muted-foreground">
                Your application is in the admin review queue. You can update your numbers below
                and resubmit.
              </p>
            ) : null}
            {clipper?.reject_reason ? (
              <p className="rounded-xl border border-foreground p-4 text-xs leading-relaxed">
                <span className="font-medium">Not approved:</span> {clipper.reject_reason}
              </p>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="followers">Follower count (main account)</Label>
              <Input
                id="followers"
                inputMode="numeric"
                value={followers}
                onChange={(e) => setFollowers(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="5000"
              />
              {followers && !eligible ? (
                <p className="text-xs">
                  You need at least {formatFollowers(MIN_FOLLOWERS_TO_APPLY)} followers to apply.
                  Keep clipping public campaigns — there's no follower gate there.
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avg_views">Average monthly views</Label>
              <Input
                id="avg_views"
                inputMode="numeric"
                value={avgViews}
                onChange={(e) => setAvgViews(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="250000"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">WhatsApp contact</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+234 800 000 0000"
              />
            </div>

            <Button type="submit" className="w-full" disabled={!complete || apply.isPending}>
              {apply.isPending
                ? "Sending…"
                : clipper?.applied_at
                  ? "Resubmit application"
                  : "Send application"}
            </Button>
            {!complete ? (
              <p className="text-center text-xs text-muted-foreground">
                All three fields are required, with {formatFollowers(MIN_FOLLOWERS_TO_APPLY)}+
                followers.
              </p>
            ) : null}
          </form>
        )}
      </section>

      <footer className="mt-12 flex flex-col items-center gap-3 text-center text-xs text-muted-foreground">
        <CommunityLinks />
        <p>Payouts in Nigerian Naira (₦) · Same rate for every clipper</p>
      </footer>
    </Shell>
  );
}
