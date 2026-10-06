import { Link } from "@tanstack/react-router";

type Tab = { to: string; label: string; glyph: string };

const CLIPPER_TABS: Tab[] = [
  { to: "/clipper", label: "Campaigns", glyph: "◎" },
  { to: "/clipper/clips", label: "My clips", glyph: "▤" },
  { to: "/become-a-clipper", label: "Join us", glyph: "★" },
  { to: "/clipper/profile", label: "Profile", glyph: "◍" },
];

const BUSINESS_TABS: Tab[] = [
  { to: "/business", label: "Campaigns", glyph: "◎" },
  { to: "/business/new", label: "Create", glyph: "＋" },
  { to: "/business/analytics", label: "Analytics", glyph: "▥" },
  { to: "/notifications", label: "Alerts", glyph: "◔" },
];

export function TabBar({ role }: { role: "clipper" | "business" }) {
  const tabs = role === "clipper" ? CLIPPER_TABS : BUSINESS_TABS;
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-md items-stretch justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <Link
              to={tab.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors"
            >
              <span aria-hidden="true" className="text-[16px] leading-none">
                {tab.glyph}
              </span>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
