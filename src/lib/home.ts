export type HomeAccountType = "business" | "clipper" | "student" | null | undefined;
export type HomePath = "/business" | "/clipper" | "/university/dashboard";

/** Where each account type lands as "home". A missing profile counts as clipper (the DB default). */
export function homePathFor(accountType: HomeAccountType): HomePath {
  if (accountType === "business") return "/business";
  if (accountType === "student") return "/university/dashboard";
  return "/clipper";
}

const KNOWN_TYPES = ["business", "clipper", "student"] as const;

/**
 * The account type to trust for routing. The profile row is the source of
 * truth, but if it can't be read (missing row, RLS) we fall back to the type
 * chosen at signup (stored in auth metadata) instead of silently assuming
 * "clipper" — that default is what sent students to the clipper area.
 */
export function resolveAccountType(
  profileType: HomeAccountType,
  user: { user_metadata?: Record<string, unknown> | null } | null | undefined,
): HomeAccountType {
  if (profileType) return profileType;
  const meta = user?.user_metadata?.["account_type"];
  return (KNOWN_TYPES as readonly unknown[]).includes(meta) ? (meta as HomeAccountType) : null;
}
