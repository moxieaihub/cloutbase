import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Logo } from "@/components/Logo";
import { TermsBox } from "@/components/TermsBox";
import { supabase } from "@/integrations/supabase/client";
import { BUSINESS_TERMS, CLIPPER_TERMS, TERMS_VERSION, deviceSignal } from "@/lib/terms";

const TYPES = {
  business: {
    label: "Business",
    heading: "Create your business account",
    blurb: "Post videos, fund a pool in ₦ and let clippers do the rest.",
  },
  clipper: {
    label: "Clipper",
    heading: "Create your clipper account",
    blurb: "Clip campaigns, rack up views and get paid in ₦.",
  },
} as const;

type AccountType = keyof typeof TYPES;

export const Route = createFileRoute("/signup/$type")({
  beforeLoad: ({ params }) => {
    if (!(params.type in TYPES)) throw notFound();
  },
  head: ({ params }) => {
    const label = params.type === "business" ? "business" : "clipper";
    const title = `Sign up as a ${label} — Cloutbase`;
    const description =
      label === "business"
        ? "Create a Cloutbase business account and get your videos clipped by Nigerian creators."
        : "Create a Cloutbase clipper account and start earning in Naira from clips.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SignupPage,
});

function SignupPage() {
  const { type } = Route.useParams();
  const config = TYPES[type as AccountType];
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!accepted) {
      setError("You must accept the terms to create an account.");
      return;
    }
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { username: username.trim(), account_type: type, device_signal: deviceSignal() },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.user) {
      await supabase.from("terms_acceptances").insert({
        user_id: data.user.id,
        kind: type === "business" ? "business_signup" : "clipper_signup",
        version: TERMS_VERSION,
        user_agent: navigator.userAgent,
      });
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && type === "clipper") await supabase.rpc("record_referral", { _code: ref });
    }

    if (data.session) {
      navigate({ to: "/dashboard" });
      return;
    }

    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col justify-center px-5 py-12">
      {sent ? (
        <div className="flex flex-col">
          <h1 className="font-display text-[23px] font-semibold tracking-[-0.02em]">
            Check your email
          </h1>
          <p className="mt-3 text-[13.5px] leading-[1.5] text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Confirm
            it to activate your Cloutbase account.
          </p>
          <Link
            to="/login"
            className="mt-8 inline-flex items-center justify-center rounded-[15px] border border-input bg-card p-[15px] font-display text-[15px] font-semibold"
          >
            Go to log in
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="mb-[34px] flex flex-col items-center gap-3.5">
            <Link to="/">
              <Logo size="lg" />
            </Link>
            <p className="text-[13px] text-muted-foreground">{config.heading}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <Field
              label={type === "business" ? "Choose a username" : "Choose a username"}
              value={username}
              onChange={setUsername}
              placeholder="pick any name — no real name needed"
              autoComplete="username"
              required
            />
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="create a password"
              autoComplete="new-password"
              minLength={6}
              required
            />

            <TermsBox
              title={type === "business" ? "Brand terms" : "Clipper rules"}
              points={type === "business" ? BUSINESS_TERMS : CLIPPER_TERMS}
              checked={accepted}
              onChange={setAccepted}
              label="I have read and accept these terms."
            />

            {error ? (
              <p className="mt-2 text-[13px] text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !accepted}
              className="mt-4 w-full rounded-[15px] bg-foreground p-[15px] font-display text-[15px] font-semibold tracking-[-0.01em] text-background transition-all hover:-translate-y-px hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-[13px] text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-foreground">
              Log in
            </Link>
          </p>
          <p className="mt-3 text-center text-[12px] text-muted-2">
            {type === "business" ? (
              <Link
                to="/signup/$type"
                params={{ type: "clipper" }}
                className="underline underline-offset-4"
              >
                Become a clipper for Cloutbase
              </Link>
            ) : (
              <Link
                to="/signup/$type"
                params={{ type: "business" }}
                className="underline underline-offset-4"
              >
                I want my video clipped instead
              </Link>
            )}
          </p>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="mb-3.5 flex flex-col">
      <span className="mb-[7px] text-[12px] tracking-[0.02em] text-muted-foreground">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[13px] border border-input bg-card p-3.5 text-[14px] outline-none transition-colors placeholder:text-muted-2 focus:border-foreground/40"
      />
    </label>
  );
}
