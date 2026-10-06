# Cloutbase — Developer Handover

Nigerian content-clipping marketplace. Brands fund campaigns, clippers post clips
to TikTok / Instagram / YouTube, verified views convert to Naira payouts.

## Stack

- TanStack Start v1 (React 19, Vite 7), TypeScript, Tailwind v4 (`src/styles.css`)
- Supabase (Postgres + Auth + Storage). Migrations in `supabase/migrations/`
- Server logic: `createServerFn` (`src/lib/*.functions.ts`) + server routes in `src/routes/api/`

## Layout

```
src/routes/                 file-based routes
  index.tsx                 landing (choose brand or clipper)
  login.tsx, signup.$type   auth
  become-a-clipper.tsx      official clipper recruitment
  _authenticated/
    business/               brand dashboard + campaign creation
    clipper/                clipper feed, briefs, submissions, profile
    university/             Cloutbase University (courses)
    admin/                  hidden control room (admin role only)
  api/public/*              webhooks / cron endpoints (no site auth — verify caller)
src/lib/                    money engine, estimator, payouts, views, exports
src/components/             shared UI
```

## Money engine (do not change without product sign-off)

- Budget split: 20% commission, 20% reserve (bonus pool), 60% clipper pool
- `per_clipper_ceiling = clipper_pool / slots`, enforced cumulatively per clipper
- Default rate ₦100 per 1,000 verified views; minimum 1,000 views to earn
- 5-day snapshot rule: `counts_from = posted_at + 5 days`; clip deleted before the
  snapshot earns nothing
- Unused reserve rolls into the next bonus round; it is never returned to Cloutbase
- Payouts released manually by an admin every Friday

## Roles and access

- Roles live in `public.user_roles` (`business | clipper | admin | super_admin`),
  never on the profile row. Checks go through the `has_role` / `is_admin`
  security-definer functions and RLS.
- `public.owner_admins` is an email allow-list. Anyone listed there is granted
  `admin` + `super_admin` automatically on signup (trigger
  `on_auth_user_created_owner_admin`). Manage it at `/admin/users`.
- Owner account: `attahojochegbe1@gmail.com`.

## Payments (intentionally open)

No gateway is hard-wired. `public.paystack_config.provider` is one of
`manual | paystack | flutterwave | stripe | other` and defaults to `manual`
(settle by hand, no gateway calls). To add a provider:

1. add it to `PROVIDERS` in `src/routes/_authenticated/admin/payments.tsx`
2. allow the value in the `paystack_config_provider_check` constraint
3. handle init + verify in `src/lib/courses.functions.ts` and campaign funding
   in `src/routes/_authenticated/business/new.tsx`

Secret keys are never stored in the database — only as server secrets.

## Environment

Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
Server: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
optional `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY`.

## Run

```
bun install
bun run dev        # http://localhost:8080
```

Apply `supabase/migrations/*` in filename order to a fresh Supabase project.
