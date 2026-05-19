"use client";

// Dev-only password sign-in/sign-up. Used for E2E and multi-account dev
// testing without round-tripping email codes. The route at
// /dev-login that mounts this is itself env-gated; this component does NOT
// re-check the env, since it never gets imported in prod bundles via the route.

import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PortfolioShell } from "./PortfolioShell";

type Flow = "signIn" | "signUp";

export function DevLoginPortfolio() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const setName = useMutation(api.shared.users.setName);
  const [flow, setFlow] = useState<Flow>("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const nameRaw = formData.get("name");
    const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
      if (flow === "signUp" && name.length > 0) {
        try {
          await setName({ name });
        } catch {
          // best-effort
        }
      }
      router.push("/dash");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(humanError(message, flow));
      setSubmitting(false);
    }
  };

  const otherFlow: Flow = flow === "signIn" ? "signUp" : "signIn";

  return (
    <PortfolioShell>
      <div className="login-card">
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: "var(--t-12)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--wax-deep)",
            marginBottom: 8,
          }}
        >
          Dev login · password
        </div>
        <h2>{flow === "signIn" ? "Welcome back." : "Make a workspace."}</h2>
        <p className="caption">
          {flow === "signIn"
            ? "Sign in with email + password. This page is disabled in production."
            : "Create a test account with a password. Disabled in production."}
        </p>
        <form onSubmit={onSubmit}>
          {flow === "signUp" && (
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                minLength={1}
                maxLength={80}
                placeholder="Jane Holloway"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="test+1@studio.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              required
              minLength={8}
              placeholder={flow === "signUp" ? "8+ characters" : ""}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="caption"
              style={{
                color: "var(--signal-red)",
                background: "rgba(193, 42, 27, 0.10)",
                border: "1px dashed rgba(193, 42, 27, 0.35)",
                borderRadius: 6,
                padding: "8px 12px",
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          <div className="flex between center" style={{ marginTop: 16, gap: 12, flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary btn-arrow" disabled={submitting}>
              {submitting
                ? flow === "signIn"
                  ? "Signing in…"
                  : "Creating…"
                : flow === "signIn"
                  ? "Open the app"
                  : "Create workspace"}
            </button>
            <Link className="btn btn-sm btn-ghost" href="/login">
              Use OTP instead
            </Link>
          </div>

          <div
            className="caption mt-24"
            style={{ paddingTop: 16, borderTop: "1px dashed var(--stitch)" }}
          >
            {flow === "signIn" ? (
              <>
                No account yet?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setFlow(otherFlow);
                    setError(null);
                  }}
                  style={{
                    color: "var(--accent-2)",
                    fontWeight: 600,
                    textDecoration: "underline",
                    textDecorationStyle: "dashed",
                    cursor: "pointer",
                  }}
                >
                  Create one
                </button>
                .
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setFlow(otherFlow);
                    setError(null);
                  }}
                  style={{
                    color: "var(--accent-2)",
                    fontWeight: 600,
                    textDecoration: "underline",
                    textDecorationStyle: "dashed",
                    cursor: "pointer",
                  }}
                >
                  Sign in
                </button>
                .
              </>
            )}
          </div>
        </form>
      </div>
    </PortfolioShell>
  );
}

function humanError(message: string, flow: Flow): string {
  if (/InvalidAccountId|InvalidSecret/i.test(message)) {
    return flow === "signIn"
      ? "That email and password don't match. Try again."
      : "We couldn't create that account. Try a different email.";
  }
  if (/already exists/i.test(message)) {
    return "An account with that email already exists. Sign in instead.";
  }
  return message;
}
