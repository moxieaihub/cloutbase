/** Payout helpers — Naira payouts are released by an admin, never automatically. */

export function normalizeName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Account name must match the real name exactly (case/space insensitive). */
export function nameMatches(
  realName: string | null | undefined,
  accountName: string | null | undefined,
): boolean {
  const a = normalizeName(realName);
  const b = normalizeName(accountName);
  return a !== "" && b !== "" && a === b;
}

export function detailsComplete(p: {
  real_name?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  account_name?: string | null;
}): boolean {
  return Boolean(
    p.real_name?.trim() &&
      p.bank_name?.trim() &&
      p.bank_account_number?.trim() &&
      p.account_name?.trim(),
  );
}

/** Payouts run weekly, every Friday. */
export function nextFriday(from = new Date()): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const delta = ((5 - d.getDay() + 7 - 1) % 7) + 1;
  d.setDate(d.getDate() + delta);
  return d;
}

export function formatDate(value: string | Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export const NIGERIAN_BANKS = [
  "Access Bank",
  "Citibank Nigeria",
  "Ecobank Nigeria",
  "Fidelity Bank",
  "First Bank of Nigeria",
  "First City Monument Bank (FCMB)",
  "Guaranty Trust Bank (GTBank)",
  "Heritage Bank",
  "Keystone Bank",
  "Kuda Microfinance Bank",
  "Moniepoint MFB",
  "Opay",
  "Palmpay",
  "Polaris Bank",
  "Providus Bank",
  "Stanbic IBTC Bank",
  "Standard Chartered Bank",
  "Sterling Bank",
  "SunTrust Bank",
  "Union Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Unity Bank",
  "Wema Bank",
  "Zenith Bank",
];
