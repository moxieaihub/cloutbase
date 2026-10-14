import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

type AdminLink = { to: string; label: string; exact?: boolean };

/*
 * To add an admin page later (e.g. Campaigns, Slot applications, Businesses),
 * add one line to the right group below. It shows up in the desktop sidebar
 * and the phone tab row automatically.
 */
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

const base =
  "flex items-center rounded-xl px-4 py-2.5 text-[14px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground";
const active = "bg-card font-semibold text-foreground";

const pill =
  "shrink-0 rounded-full border border-input px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground";
const pillActive = "border-foreground/40 bg-card font-semibold text-foreground";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen">
      {/* Floating header — same as the clipper app */}
      <header className="sticky top-0 z-40 px-4 pt-3 md:px-6 md:pt-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-input bg-background/70 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl md:px-5">
          <div className="flex items-center gap-3">
            <Link to="/admin" aria-label="Admin home">
              <Logo size="sm" />
            </Link>
            <span className="hidden rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
              Control room
            </span>
          </div>

          <nav className="flex items-center gap-1 text-[14px]" aria-label="Main">
            <Link
              to="/dashboard"
              className="hidden rounded-full px-3.5 py-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:inline-flex"
            >
              Exit admin
            </Link>
            <button
              onClick={signOut}
              className="rounded-full border border-input px-4 py-2 font-semibold transition-colors hover:border-foreground/40"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-6 pb-28 pt-8 md:max-w-3xl md:px-8 lg:grid lg:max-w-6xl lg:grid-cols-[220px_1fr] lg:gap-10 lg:px-12 lg:pb-12 lg:pt-10">
        {/* Desktop sidebar */}
        <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
          <nav
            className="flex flex-col gap-1 rounded-2xl border border-input bg-card/40 p-2"
            aria-label="Admin"
          >
            {GROUPS.map((group, i) => (
              <div key={group.title} className="flex flex-col gap-1">
                <p
                  className={`px-4 pb-1 text-[10px] uppercase tracking-widest text-muted-2 ${
                    i === 0 ? "pt-2" : "pt-4"
                  }`}
                >
                  {group.title}
                </p>
                {group.links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to as never}
                    activeOptions={{ exact: l.exact ?? false }}
                    className={base}
                    activeProps={{ className: active }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {/* Phone / tablet: scrollable row of the same links */}
          <nav
            className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden"
            aria-label="Admin"
          >
            {GROUPS.flatMap((g) => g.links).map((l) => (
              <Link
                key={l.to}
                to={l.to as never}
                activeOptions={{ exact: l.exact ?? false }}
                className={pill}
                activeProps={{ className: pillActive }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {children}
        </main>
      </div>
    </div>
  );
}
