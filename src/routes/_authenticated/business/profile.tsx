import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { BrandShell } from "@/features/brand/components/BrandShell";
import { fieldCls, labelCls } from "@/features/brand/format";
import {
  useBrandCampaigns,
  useBrandProfile,
  useBrandUsername,
  useSaveBrandProfile,
  type BrandProfileRow,
} from "@/features/brand/queries";
import { formatCompact } from "@/lib/campaign";

export const Route = createFileRoute("/_authenticated/business/profile")({
  head: () => ({
    meta: [
      { title: "Brand profile — Cloutbase" },
      { name: "description", content: "Your company details and account." },
    ],
  }),
  component: BrandProfilePage,
});

function BrandProfilePage() {
  const { user } = Route.useRouteContext();
  const { data: profile, isLoading } = useBrandProfile(user.id);

  return (
    <BrandShell>
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Brand profile</h1>
      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        // key resets the form once the saved profile arrives
        <ProfileForm key={profile?.user_id ?? "new"} userId={user.id} email={user.email ?? ""} initial={profile} />
      )}
    </BrandShell>
  );
}

function ProfileForm({
  userId,
  email,
  initial,
}: {
  userId: string;
  email: string;
  initial: BrandProfileRow | null | undefined;
}) {
  const save = useSaveBrandProfile(userId);
  const { data: username } = useBrandUsername(userId);
  const { data: campaigns } = useBrandCampaigns();

  const [companyName, setCompanyName] = useState(initial?.company_name ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? "");
  const [about, setAbout] = useState(initial?.about ?? "");

  const list = campaigns ?? [];
  const confirmed = list.reduce((s, c) => s + Number(c.confirmed_views), 0);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <section className="rounded-2xl border border-border p-6">
        <label className="block">
          <span className={labelCls}>Company / brand name</span>
          <input className={fieldCls} value={companyName} maxLength={120} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your brand" />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>Website</span>
          <input className={fieldCls} value={website} maxLength={300} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourbrand.com" />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>WhatsApp number</span>
          <input className={fieldCls} value={whatsapp} inputMode="tel" maxLength={30} onChange={(e) => setWhatsapp(e.target.value)} placeholder="0801 234 5678" />
        </label>
        <label className="mt-4 block">
          <span className={labelCls}>About your brand</span>
          <textarea className={`${fieldCls} min-h-24`} value={about} maxLength={600} onChange={(e) => setAbout(e.target.value)} />
        </label>
        <Button
          className="mt-5"
          disabled={save.isPending}
          onClick={() => save.mutate({ company_name: companyName, website, whatsapp, about })}
        >
          {save.isPending ? "Saving…" : "Save profile"}
        </Button>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-border p-5 text-sm">
          <p className="text-xs text-muted-foreground">Account</p>
          <p className="mt-2 font-medium">@{username ?? "brand"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{email}</p>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border p-4">
            <p className="text-[11px] text-muted-foreground">Campaigns</p>
            <p className="mt-1 text-xl font-semibold">{list.length}</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-[11px] text-muted-foreground">Confirmed views</p>
            <p className="mt-1 text-xl font-semibold text-[#4DA3FF]">{formatCompact(confirmed)}</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
