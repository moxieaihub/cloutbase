import { cn } from "@/lib/utils";

/**
 * Cloutbase lockup — matches the prototype: a paper play-mark with an
 * up-arrow knocked out of it, next to the lowercase "cloutbase" wordmark.
 */
export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "text-[17px] gap-2",
    md: "text-[20px] gap-2",
    lg: "text-[26px] gap-2",
    xl: "text-[38px] gap-2.5 font-bold tracking-[-0.04em]",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center font-display font-semibold tracking-[-0.03em] text-foreground",
        sizes,
        className,
      )}
      aria-label="cloutbase"
    >
      <svg
        viewBox="0 0 100 100"
        className={size === "xl" ? "h-10 w-10 shrink-0" : "h-[1.15em] w-[1.15em] shrink-0"}
        aria-hidden="true"
      >
        <path
          d="M30 22 L30 78 L78 50 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinejoin="round"
        />
        <path
          d="M50 36 L61 50 L53 50 L53 63 L47 63 L47 50 L39 50 Z"
          className="fill-background"
        />
      </svg>
      <span aria-hidden="true">cloutbase</span>
    </span>
  );
}
