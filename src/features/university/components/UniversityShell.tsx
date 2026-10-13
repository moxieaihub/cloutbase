import { Link } from "@tanstack/react-router";

import { UniversityTopBar } from "@/features/university/components/UniversityTopBar";

const TABS = [
  { to: "/university/dashboard", label: "Dashboard", exact: true },
  { to: "/university", label: "Catalog", exact: true },
  { to: "/university/my-courses", label: "My courses", exact: false },
] as const;

export function UniversityShell({
  children,
  hideTabs = false,
}: {
  children: React.ReactNode;
  hideTabs?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-28 pt-10 lg:px-10">
      <UniversityTopBar />

      {hideTabs ? null : (
        <nav className="mt-6 flex gap-6 border-b border-border text-sm">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.exact }}
              className="-mb-px border-b-2 border-transparent pb-3 text-muted-foreground hover:text-foreground data-[status=active]:border-[#4DA3FF] data-[status=active]:text-foreground"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      )}

      {children}
    </main>
  );
}
