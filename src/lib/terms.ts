/** Click-to-accept terms. Every acceptance is logged in terms_acceptances. */

export const TERMS_VERSION = "v1";

export const CLIPPER_TERMS = [
  "Real views only. Fake views, bots, view farms, bought engagement or multi-accounting means an immediate ban — no warning, no pay.",
  "Clips must stay live for at least 5 days. A clip deleted before its 5-day snapshot earns ₦0.",
  "I am 18 years or older.",
  "Earnings are capped at the campaign's per-clipper ceiling and are released by Cloutbase admin, weekly on Fridays.",
  "Every campaign holds back a 20% reserve that is paid out to clippers as bonuses. Anything unused rolls into the next bonus round — it never goes back to Cloutbase.",
] as const;

export const CAMPAIGN_TERMS = [
  "I will only post real, organic clips. Any fake views, bots or bought engagement on this campaign is an instant, permanent ban with no pay.",
  "I will use the brand's exact caption, hashtags, tag and CTA link, and keep each clip live for at least 5 days.",
  "I am 18 years or older and this account is my only Cloutbase account.",
] as const;

export const BUSINESS_TERMS = [
  "My brand is solely responsible for the message, claims and creative in the content I submit.",
  "If the content is false, misleading, defamatory or political, my brand is liable — not Cloutbase.",
  "Cloutbase retains a service commission from each campaign.",
  "I hold the rights to the video I upload and to the assets clippers are asked to use.",
] as const;

/**
 * A coarse, non-PII device signal used only to flag banned users trying to
 * re-register. It is not a tracking identifier and holds no personal data.
 */
export function deviceSignal(): string {
  if (typeof window === "undefined") return "";
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(new Date().getTimezoneOffset()),
  ].join("|");
  let hash = 0;
  for (let i = 0; i < parts.length; i += 1) {
    hash = (hash << 5) - hash + parts.charCodeAt(i);
    hash |= 0;
  }
  return `d${Math.abs(hash).toString(36)}`;
}

export function referralLink(code: string): string {
  const origin = typeof window === "undefined" ? "https://cloudbaze.lovable.app" : window.location.origin;
  return `${origin}/signup/clipper?ref=${code}`;
}
