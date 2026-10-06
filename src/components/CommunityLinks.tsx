import { cn } from "@/lib/utils";

export const COMMUNITY_TELEGRAM_URL = "https://t.me/cloutbase";
export const COMMUNITY_X_URL = "https://x.com/cloutbase";

export function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path d="M21.94 3.56a1.5 1.5 0 0 0-1.58-1.23L2.17 9.88a1.5 1.5 0 0 0 .13 2.83l4.36 1.3 1.83 6.02a1.5 1.5 0 0 0 2.77.06l1.45-3.23 4.53 3.4a1.5 1.5 0 0 0 2.4-.74l4.08-16.04a1.5 1.5 0 0 0-.01-.92Zm-6.11 13.37-4.09-3.07 6.42-8.93-8.56 8.25-5.8-1.73 15.35-6.21-3.32 11.69Z" />
    </svg>
  );
}

export function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function CommunityLinks({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "pill";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        variant === "pill" && "rounded-full border border-border bg-card px-3 py-1.5",
        className,
      )}
    >
      <a
        href={COMMUNITY_TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <TelegramIcon /> Telegram
      </a>
      <span aria-hidden="true" className="text-border">
        ·
      </span>
      <a
        href={COMMUNITY_X_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <XIcon /> X
      </a>
    </div>
  );
}
