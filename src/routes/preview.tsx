import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/preview")({
  head: () => ({
    meta: [
      { title: "Preview mode — every Cloutbase page" },
      {
        name: "description",
        content:
          "A page-by-page index of Cloutbase: landing, signup, login, clipper, business and admin screens, with who can open each one.",
      },
      { property: "og:title", content: "Preview mode — every Cloutbase page" },
      {
        property: "og:description",
        content: "Jump straight to any Cloutbase screen while you review the build.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PreviewIndex,
});

type Entry = { to: string; label: string; note: string; params?: Record<string, string> };

const GROUPS: { title: string; access: string; pages: Entry[] }[] = [
  {
    title: "Public",
    access: "Anyone",
    pages: [
      { to: "/", label: "Landing", note: "Clip my video / I'm a clipper" },
      { to: "/become-a-clipper", label: "Become a clipper", note: "Recruitment + application" },
      { to: "/login", label: "Log in", note: "Returning users" },
      {
        to: "/signup/$type",
        params: { type: "business" },
        label: "Business signup",
        note: "Brands funding campaigns",
      },
      {
        to: "/signup/$type",
        params: { type: "clipper" },
        label: "Clipper signup",
        note: "Clippers joining campaigns",
      },
    ],
  },
  {
    title: "Clipper",
    access: "Signed in as a clipper",
    pages: [
      { to: "/clipper", label: "Clipper dashboard", note: "Campaign menu + earnings" },
      { to: "/clipper/profile", label: "Payment details", note: "Bank details, payouts" },
    ],
  },
  {
    title: "Business",
    access: "Signed in as a business",
    pages: [
      { to: "/business", label: "Business dashboard", note: "Your campaigns + spend" },
      { to: "/business/new", label: "New campaign", note: "Budget, estimator, funding" },
    ],
  },
  {
    title: "Admin",
    access: "Admin role only",
    pages: [
      { to: "/admin", label: "Review queue", note: "Approve or reject funded campaigns" },
      { to: "/admin/analytics", label: "Analytics", note: "Campaign → clipper → clips" },
      { to: "/admin/clippers", label: "Clippers", note: "Applications, watermark, in-house" },
      { to: "/admin/views", label: "View tracking", note: "Manual readings + history" },
      { to: "/admin/payouts", label: "Payouts", note: "Weekly Friday queue" },
      { to: "/admin/users", label: "Users", note: "Super-admin promotions" },
      { to: "/admin/email", label: "Email service", note: "External provider config" },
      { to: "/admin/payments", label: "Payment provider", note: "Money in and out" },
      { to: "/admin/scraper", label: "View Scraper API", note: "External view provider" },
    ],
  },
];

function PreviewIndex() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
      <header className="flex items-center justify-between">
        <Logo size="sm" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Preview mode</span>
      </header>

      <h1 className="mt-10 text-2xl font-semibold tracking-tight">Every page, one tap away</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Walk the app screen by screen. Signed-in pages open only when you're logged in with the
        matching account type — create a real account from the signup pages.
      </p>

      <div className="mt-8 space-y-8">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide">{g.title}</h2>
              <span className="text-xs text-muted-foreground">{g.access}</span>
            </div>
            <ul className="mt-3 space-y-2">
              {g.pages.map((p) => (
                <li key={p.label}>
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={p.to as any}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    params={p.params as any}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3 transition-colors hover:border-foreground"
                  >
                    <span>
                      <span className="block text-sm font-medium">{p.label}</span>
                      <span className="block text-xs text-muted-foreground">{p.note}</span>
                    </span>
                    <span aria-hidden className="text-muted-foreground">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Bookmark /preview while you review the build.
      </p>
    </main>
  );
}
