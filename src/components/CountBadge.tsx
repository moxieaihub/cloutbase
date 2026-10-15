/** Small red unread-count bubble. Renders nothing when the count is 0. */
export function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className={`inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold leading-[18px] text-white ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
