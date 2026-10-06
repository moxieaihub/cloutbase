# Cloutbase v2 — phased upgrade plan

Your v2 documents change several things that are already built (colours, budget tiers, slot rules, ranks, navigation, public pages). Rather than one big rewrite, this goes phase by phase — you check each phase in the preview before I start the next.

## Phase 1 — Look and feel ("Ancient Gild")

- Repaint the whole app: Onyx `#0A0A0A` background, Alabaster Grey `#E5E4E2` text, Blue Slate `#536878` accent, lifted `#8FA9BD` for money figures.
- Remove the green money accent everywhere (money now rides on Blue Slate).
- Logo: lowercase `cloutbase` wordmark with an up-arrow inside the "o".
- Landing page rebuilt to the prototype: headline "Turn a budget into millions of real views. Or turn your clips into real money.", the two role cards ("Clip my video" / "I'm a clipper"), the "For brands · For creators · For clippers" row, and "Already have an account? Log in".
- Auto-scrolling platform marquee (TikTok, YouTube, Instagram, Facebook, Kick, X) on landing and login.
- No Lovable badge anywhere.

## Phase 2 — Money engine and ranks (database)

- Budget minimum drops to ₦50,000. Tiers become Starter ₦50,000 (1 week) / Growth ₦200,000 (2 weeks) / Scale ₦500,000+ (4 weeks).
- Slots scale with budget instead of a fixed 20: under ₦100k → 5, ₦100k–299k → 10, ₦300k–699k → 15, ₦700k+ → 20.
- Keep the 20/20/60 split and `ceiling = pool ÷ slots`.
- Volume rule: hitting the ceiling caps *payout only*. Clippers can keep posting; extra views still count toward campaign totals, rank and bonus eligibility. Wording and validation updated so nothing blocks extra posting.
- New rank system on lifetime verified views: Rookie 0–100k, Pro 100k–500k, Elite 500k–2M, Legend 2M+ (clean record). Auto-promotion. Rank changes daily clip limits (3 / 5 / 8 / in-house corps) and access, never the pay rate.
- New `clipper_accounts` table: one linked account per platform, max 3 (handle, followers, avg views). Clip submissions record which account posted them.
- Campaigns gain `creator_name` and `watermark_required`.

## Phase 3 — Clipper and business apps with the bottom tab bar

- Role-based bottom navigation (no admin tab): clippers see Campaigns · My Clips · Join Us · Profile; businesses see Campaigns · Create · Analytics · Profile.
- Clipper: campaign cards led by "Earn up to ₦X"; campaign detail with the new posting copy; **My Clips** tab with live view counts, per-clip earnings, status (counting / counted / snapshot pending), clickable links, weekly earnings banner, and submit-with-account-picker; Profile tab with the rank card + ladder, linked accounts, and payment details.
- Business: campaigns home, the create flow updated to the new tiers/estimator, and a per-campaign **Analytics** page — big verified-views number, clips count, pool spent vs pool size, views-by-platform bars, top clips with clickable links, and "Email me this report".

## Phase 4 — Admin control room and public/trust layer

- Admin (still hidden at `/admin`): top analytics block (lifetime platform views, live campaigns, total owed out, platform breakdown), review queue, drilldown showing rank badges, "synced Xm ago" plus a re-sync button on every clip, flags, weekly Friday payout queue, in-house creator campaigns with `creator_name` and enforced watermark.
- Three public About pages — For brands, For creators, For clippers — each with the 3-step explainer and its own call to action.
- "Join Us" application updated: qualify on **any one** platform with 5,000+ followers (up to 3 linked accounts) plus WhatsApp, into the admin approval queue.
- Terms gates, ban/re-registration blocking, notifications and referral links carried over and checked against the v2 wording.

## Notes

- The three integration boxes (View Scraper API, Paystack keys, Email service) stay as clearly labelled credential forms — nothing faked, manual admin view entry remains the fallback.
- Existing accounts and data are preserved; every schema change ships as a migration so the GitHub export keeps the database intact.
- Send me the logo file when you have it and I will swap the drawn wordmark for the real image.

## Technical notes

- New migrations: `clipper_accounts`, rank enum + `lifetime_views` with an auto-promotion trigger, `campaigns.creator_name` / `watermark_required`, `clip_submissions.clipper_account_id` / `last_synced_at`, and updated slot-bracket logic in the funding trigger. Existing rows backfilled.
- `src/lib/campaign.ts` and `src/lib/clipper.ts` get the new tier, slot-bracket, and rank constants; `src/lib/payout.ts` keeps the cumulative cap but stops treating the ceiling as a posting limit.
- New `BottomNav` component mounted in the `_authenticated` layout, role-aware.
- New routes: `/for-brands`, `/for-creators`, `/for-clippers`, `/clipper/clips`, `/business/analytics`, `/business/analytics/$campaignId`.
