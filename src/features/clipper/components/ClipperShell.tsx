import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { CountBadge } from "@/components/CountBadge";
import { Logo } from "@/components/Logo";
import { useUnreadNotifications } from "@/features/notifications/queries";
import { supabase } from "@/integrations/supabase/client";

const LINKS = [
  { to: "/clipper", label: "Campaigns", exact: true },
  { to: "/clipper/clips", label: "My clips", exact: false },
  { to: "/clipper/earnings", label: "Rank & earnings", exact: false },
  { to: "/clipper/profile", label: "Profile", exact: false },
  { to: "/clipper/official", label: "Official Clipper", exact: false },
  { to: "/notifications", label: "Notifications", exact: true },
] as const;

const sideLink =
  "flex items-center justify-between rounded-xl px-4 py-2.5 text-[14px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground data-[status=active]:bg-card data-[status=active]:font-semibold data-[status=active]:text-foreground";
const pill =
  "flex shrink-0 items-center gap-1.5 rounded-full border border-input px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-foreground/40 data-[status=active]:bg-card data-[status=active]:font-semibold data-[status=active]:text-foreground";

function ClipperHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: unread = 0 } = useUnreadNotifications();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 md:px-6 md:pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-input bg-background/70 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl md:px-5">
        <div className="flex items-center gap-3">
          <Link to="/clipper" aria-label="Cloutbase clipper home">
            <Logo size="sm" />
          </Link>
          <span className="hidden rounded-full border border-input px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
            Clipper
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-input text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <CountBadge count={unread} className="absolute -right-1 -top-1" />
          </Link>
          <button
            onClick={signOut}
            className="rounded-full border border-input px-4 py-2 text-[14px] font-semibold transition-colors hover:border-foreground/40"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export function ClipperShell({
  children,
  hideTabs = false,
}: {
  children: React.ReactNode;
  /** Hide the phone pill row on deep pages. The desktop sidebar always shows. */
  hideTabs?: boolean;
}) {
  const { data: unread = 0 } = useUnreadNotifications();

  return (
    <div className="min-h-screen">
      <ClipperHeader />

      <div className="mx-auto w-full max-w-md px-6 pb-28 pt-8 md:max-w-3xl md:px-8 lg:grid lg:max-w-6xl lg:grid-cols-[220px_1fr] lg:gap-10 lg:px-12 lg:pb-12 lg:pt-10">
        <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
          <nav aria-label="Clipper" className="flex flex-col gap-1 rounded-2xl border border-input bg-card/40 p-2">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} activeOptions={{ exact: l.exact }} className={sideLink}>
                {l.label}
                {l.to === "/notifications" ? <CountBadge count={unread} /> : null}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {hideTabs ? null : (
            <nav className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden" aria-label="Clipper">
              {LINKS.map((l) => (
                <Link key={l.to} to={l.to} activeOptions={{ exact: l.exact }} className={pill}>
                  {l.label}
                  {l.to === "/notifications" ? <CountBadge count={unread} /> : null}
                </Link>
              ))}
            </nav>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
