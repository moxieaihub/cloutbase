import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Logo } from "@/components/Logo";

import { RecentPayouts } from "@/components/RecentPayouts";
import { supabase } from "@/integrations/supabase/client";


// Only follow same-site paths ("/university"), never "//evil.com" or full URLs.
function safeRedirect(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : undefined;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: safeRedirect(search.redirect),
  }),
  head: () => ({
    meta: [
      { title: "Log in — Cloutbase" },
      {
        name: "description",
        content: "Log in to your Cloutbase account to manage campaigns or track your clip earnings in Naira.",
      },
      { property: "og:title", content: "Log in — Cloutbase" },
      {
        property: "og:description",
        content: "Log in to Cloutbase to manage campaigns or track your clip earnings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    if (redirect) {
      router.history.push(redirect);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col justify-center px-5 py-12 md:max-w-[440px] lg:grid lg:max-w-5xl lg:grid-cols-2 lg:content-center lg:gap-x-20 lg:gap-y-10 lg:px-12">
      {/* Brand / welcome */}
      <div className="mb-[34px] flex flex-col items-center gap-3.5 lg:mb-0 lg:items-start lg:gap-6 lg:self-end">
        <Link to="/">
          <Logo size="lg" />
        </Link>
        <p className="text-[13px] text-muted-foreground lg:hidden">Welcome back. Log in to keep clipping.</p>
        <div className="hidden lg:block">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-[-0.035em]">
            Welcome back.
          </h1>
          <p className="mt-4 max-w-sm text-lg leading-[1.5] text-muted-foreground">
            Log in to keep clipping, manage your campaigns or track your earnings in Naira.
          </p>
        </div>
      </div>

      {/* Form column */}
      <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center lg:rounded-[24px] lg:border lg:border-border/60 lg:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <label className="mb-3.5 flex flex-col">
            <span className="mb-[7px] text-[12px] tracking-[0.02em] text-muted-foreground">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              className="rounded-[13px] border border-input bg-card p-3.5 text-[14px] outline-none transition-colors placeholder:text-muted-2 focus:border-foreground/40"
            />
          </label>
          <label className="mb-3.5 flex flex-col">
            <span className="mb-[7px] text-[12px] tracking-[0.02em] text-muted-foreground">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="rounded-[13px] border border-input bg-card p-3.5 text-[14px] outline-none transition-colors placeholder:text-muted-2 focus:border-foreground/40"
            />
          </label>

          {error ? (
            <p className="mb-2 text-[13px] text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[15px] bg-foreground p-[15px] font-display text-[15px] font-semibold tracking-[-0.01em] text-background transition-all hover:-translate-y-px hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          New here?{" "}
          <Link
            to="/signup/$type"
            params={{ type: "clipper" }}
            search={{ redirect }}
            className="font-semibold text-foreground"
          >
            Create an account
          </Link>
        </p>
      </div>

      {/* Recent payouts */}
      <div className="mt-8 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:self-start">
        <RecentPayouts />
      </div>
    </main>
  );
}
