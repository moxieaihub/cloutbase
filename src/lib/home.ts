export type HomeAccountType = "business" | "clipper" | "student" | null | undefined;
export type HomePath = "/business" | "/clipper" | "/university/dashboard";

/** Where each account type lands as "home". A missing profile counts as clipper (the DB default). */
export function homePathFor(accountType: HomeAccountType): HomePath {
  if (accountType === "business") return "/business";
  if (accountType === "student") return "/university/dashboard";
  return "/clipper";
}
