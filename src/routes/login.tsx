import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Logo } from "@/components/Logo";

import { RecentPayouts } from "@/components/RecentPayouts";
import { supabase } from "@/integrations/supabase/client";
import { startDemoSession } from "@/lib/demo.functions";


export const Route = createFileRoute("/login")({
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const beginDemo = useServerFn(startDemoSession);

  async function handleDemo(role: "business" | "clipper" | "admin") {
    setError(null);
    setDemoLoading(role);
    try {
      const creds = await beginDemo({ data: { role } });
      const { error: signInError } = await supabase.auth.signInWithPassword(creds);
      if (signInError) throw new Error(signInError.message);
      navigate({ to: role === "admin" ? "/admin" : role === "business" ? "/business" : "/clipper" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the demo session.");
    } finally {
      setDemoLoading(null);
    }
  }


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
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col justify-center px-5 py-12">
      <div className="mb-[34px] flex flex-col items-center gap-3.5">
        <Link to="/">
          <Logo size="lg" />
        </Link>
        <p className="text-[13px] text-muted-foreground">Welcome back. Log in to keep clipping.</p>
      </div>

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

      <div className="mt-6 rounded-[16px] border border-border/60 bg-card p-4">
        <p className="mb-3 text-center text-[12px] tracking-[0.02em] text-muted-foreground">
          Demo mode — one tap in, no password needed
        </p>
        <div className="flex flex-col gap-2">
          {(["business", "clipper", "admin"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleDemo(role)}
              disabled={demoLoading !== null}
              className="w-full rounded-[13px] border border-input bg-background p-3 text-[14px] font-semibold capitalize transition-colors hover:border-foreground/40 disabled:opacity-50"
            >
              {demoLoading === role ? "Opening…" : `Continue as ${role}`}
            </button>
          ))}
        </div>
      </div>



      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        New here?{" "}
        <Link
          to="/signup/$type"
          params={{ type: "clipper" }}
          className="font-semibold text-foreground"
        >
          Create an account
        </Link>
      </p>

      <div className="mt-8">
        <RecentPayouts />
      </div>
    </main>
  );
}

