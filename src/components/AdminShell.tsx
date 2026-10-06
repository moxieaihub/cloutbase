import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/Logo";

type AdminLink = { to: string; label: string; exact?: boolean };

const GROUPS: { title: string; links: AdminLink[] }[] = [
  {
    title: "Operations",
    links: [
      { to: "/admin", label: "Review queue", exact: true },
      { to: "/admin/analytics", label: "Analytics" },
      { to: "/admin/views", label: "View tracking" },
      { to: "/admin/payouts", label: "Payouts" },
      { to: "/admin/university", label: "University" },

    ],
  },
  {
    title: "People",
    links: [
      { to: "/admin/clippers", label: "Clippers" },
      { to: "/admin/users", label: "Admin access" },
      { to: "/admin/bans", label: "Bans & strikes" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { to: "/admin/email", label: "Email service" },
      { to: "/admin/payments", label: "Payment provider" },
      { to: "/admin/scraper", label: "View scraper" },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Control room
            </span>
          </div>
          <Link
            to="/dashboard"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Exit admin
          </Link>
        </div>
        <nav className="mx-auto flex w-full max-w-6xl gap-x-4 overflow-x-auto px-5 pb-2 text-xs lg:hidden">
          {GROUPS.flatMap((g) => g.links).map((l) => (
            <Link
              key={l.to}
              to={l.to as never}
              activeOptions={{ exact: l.exact ?? false }}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="whitespace-nowrap py-1"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-10 px-5 py-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-6">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {group.title}
                </p>
                <ul className="mt-2 space-y-1">
                  {group.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to as never}
                        activeOptions={{ exact: l.exact ?? false }}
                        activeProps={{
                          className: "bg-card text-foreground",
                        }}
                        inactiveProps={{ className: "text-muted-foreground" }}
                        className="block rounded-lg px-3 py-2 text-sm transition-colors hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
