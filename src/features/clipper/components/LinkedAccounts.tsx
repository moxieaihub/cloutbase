import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLATFORMS, platformLabel, type Platform } from "@/lib/clipper";
import { formatViews } from "@/lib/views";
import { useAddAccount, useMyAccounts, useRemoveAccount } from "../queries";

export function LinkedAccounts({ userId }: { userId: string }) {
  const { data: accounts } = useMyAccounts(userId);
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [handle, setHandle] = useState("");
  const [followers, setFollowers] = useState("");
  const [avgViews, setAvgViews] = useState("");

  const add = useAddAccount(userId, () => {
    setHandle("");
    setFollowers("");
    setAvgViews("");
  });
  const remove = useRemoveAccount(userId);

  const list = accounts ?? [];
  const full = list.length >= 3;
  const digits = (v: string) => Number(v.replace(/\D/g, "") || 0);

  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Linked accounts</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Link up to 3 accounts. You pick one each time you submit a clip, and admins vet you on average views.
      </p>

      <ul className="mt-4 space-y-2">
        {list.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {platformLabel(a.platform)} · @{a.handle}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {Number(a.followers).toLocaleString("en-NG")} followers · {formatViews(Number(a.avg_views))} avg views
              </p>
            </div>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => remove.mutate(a.id)}
              className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
        {list.length === 0 ? (
          <li className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No accounts linked yet. Link one to submit clips.
          </li>
        ) : null}
      </ul>

      {full ? (
        <p className="mt-3 text-xs text-muted-foreground">You’ve linked the maximum of 3 accounts.</p>
      ) : (
        <form
          className="mt-4 space-y-3 rounded-2xl border border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate({ platform, handle, followers: digits(followers), avgViews: digits(avgViews) });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-platform">Platform</Label>
              <select
                id="acc-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-handle">Handle</Label>
              <Input id="acc-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourname" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-followers">Followers</Label>
              <Input
                id="acc-followers"
                inputMode="numeric"
                value={followers}
                onChange={(e) => setFollowers(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="5000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-views">Average views per post</Label>
              <Input
                id="acc-views"
                inputMode="numeric"
                value={avgViews}
                onChange={(e) => setAvgViews(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="2500"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={add.isPending || !handle.trim()}>
            {add.isPending ? "Linking…" : "Link account"}
          </Button>
        </form>
      )}
    </section>
  );
}
