import { Link } from "@tanstack/react-router";

const base =
  "flex items-center rounded-xl px-4 py-2.5 text-[14px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground";
const active = "bg-card font-semibold text-foreground";

/** Desktop sidebar, matching the clipper sidebar. */
export function UniversitySidebar() {
  return (
    <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
      <nav
        className="flex flex-col gap-1 rounded-2xl border border-input bg-card/40 p-2"
        aria-label="University"
      >
        <Link
          to="/university/dashboard"
          activeOptions={{ exact: true }}
          className={base}
          activeProps={{ className: active }}
        >
          Dashboard
        </Link>
        <Link
          to="/university"
          activeOptions={{ exact: true }}
          className={base}
          activeProps={{ className: active }}
        >
          Catalog
        </Link>
        <Link to="/university/my-courses" className={base} activeProps={{ className: active }}>
          My courses
        </Link>
      </nav>
    </aside>
  );
}

/** Phone version of the same links: a scrollable row of pills. */
export function UniversityMobileTabs() {
  const pill =
    "shrink-0 rounded-full border border-input px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground";
  const pillActive = "border-foreground/40 bg-card font-semibold text-foreground";

  return (
    <nav
      className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden"
      aria-label="University"
    >
      <Link
        to="/university/dashboard"
        activeOptions={{ exact: true }}
        className={pill}
        activeProps={{ className: pillActive }}
      >
        Dashboard
      </Link>
      <Link
        to="/university"
        activeOptions={{ exact: true }}
        className={pill}
        activeProps={{ className: pillActive }}
      >
        Catalog
      </Link>
      <Link to="/university/my-courses" className={pill} activeProps={{ className: pillActive }}>
        My courses
      </Link>
    </nav>
  );
}
