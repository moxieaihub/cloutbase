import { Link } from "@tanstack/react-router";

const base =
  "flex items-center rounded-xl px-4 py-2.5 text-[14px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground";
const active = "bg-card font-semibold text-foreground";

export function ClipperSidebar() {
  return (
    <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
      <nav
        className="flex flex-col gap-1 rounded-2xl border border-input bg-card/40 p-2"
        aria-label="Clipper"
      >
        <Link
          to="/clipper"
          activeOptions={{ exact: true }}
          className={base}
          activeProps={{ className: active }}
        >
          Campaigns
        </Link>
        <Link to="/clipper/clips" className={base} activeProps={{ className: active }}>
          My clips
        </Link>
        <Link to="/become-a-clipper" className={base} activeProps={{ className: active }}>
          Join us
        </Link>
        <Link to="/clipper/profile" className={base} activeProps={{ className: active }}>
          Profile
        </Link>
      </nav>
    </aside>
  );
}
