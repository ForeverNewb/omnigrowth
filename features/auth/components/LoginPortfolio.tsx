"use client";

// OTP-based sign-in. Two-step flow:
//   1. User enters email (+ name on signUp). We call signIn("resend-otp", {email})
//      which dispatches an 8-digit code via Resend.
//   2. User enters the code. We call signIn("resend-otp", {email, code}) to verify.
//   3. On signUp success, we call users.setName({name}) so the WelcomeHeading and
//      future profile screens have something to show.
//
// The Password flow lives at /dev-login — gated by NEXT_PUBLIC_ENABLE_DEV_LOGIN
// so prod users never see it. Used for E2E + multi-account dev testing.

import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PortfolioShell } from "./PortfolioShell";

type Flow = "signIn" | "signUp";
type Step = "email" | "code";

export function LoginPortfolio() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const setName = useMutation(api.shared.users.setName);

  const [flow, setFlow] = useState<Flow>("signIn");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setNameInput] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otherFlow: Flow = flow === "signIn" ? "signUp" : "signIn";

  const onEmailStep = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("resend-otp", { email });
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setSubmitting(false);
    }
  };

  const onCodeStep = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("resend-otp", { email, code });
      if (flow === "signUp" && name.trim().length > 0) {
        try {
          await setName({ name });
        } catch {
          // Non-fatal — name capture is best-effort. Sign-in already succeeded.
        }
      }
      router.push("/dash");
    } catch (err) {
      setError(humanCodeError(err instanceof Error ? err.message : ""));
      setSubmitting(false);
    }
  };

  return (
    <PortfolioShell>
      <div className="login-card">
        <h2>
          {step === "code"
            ? "Check your email."
            : flow === "signIn"
              ? "Welcome back."
              : "Make a workspace."}
        </h2>
        <p className="caption">
          {step === "code"
            ? `We sent an 8-digit code to ${email}. It expires in 20 minutes.`
            : flow === "signIn"
              ? "Sign in with a code we'll email you. No password needed."
              : "Create your account — closed beta. Use a real email; we send notifications and your sign-in code there."}
        </p>

        {step === "email" ? (
          <form onSubmit={onEmailStep}>
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
                  value={name}
                  onChange={(e) => setNameInput(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
              />
            </div>

            {error && <ErrorBanner message={error} />}

            <FooterRow
              submittingLabel={flow === "signIn" ? "Sending…" : "Creating…"}
              idleLabel={flow === "signIn" ? "Send code" : "Send code"}
              submitting={submitting}
            />

            <div
              className="caption mt-24"
              style={{ paddingTop: 16, borderTop: "1px dashed var(--stitch)" }}
            >
              {flow === "signIn" ? (
                <>
                  No account yet?{" "}
                  <SwitchFlowButton
                    onClick={() => {
                      setFlow(otherFlow);
                      setError(null);
                    }}
                    label="Create one"
                  />
                  .
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <SwitchFlowButton
                    onClick={() => {
                      setFlow(otherFlow);
                      setError(null);
                    }}
                    label="Sign in"
                  />
                  .
                </>
              )}
            </div>
          </form>
        ) : (
          <form onSubmit={onCodeStep}>
            <div className="field">
              <label htmlFor="code">Sign-in code</label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                pattern="\d{8}"
                minLength={8}
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="12345678"
                style={{
                  letterSpacing: "0.4em",
                  fontFamily: "var(--mono)",
                  fontSize: "var(--t-18)",
                }}
              />
            </div>

            {error && <ErrorBanner message={error} />}

            <FooterRow
              submittingLabel="Verifying…"
              idleLabel={flow === "signIn" ? "Open the app" : "Create workspace"}
              submitting={submitting}
            />

            <div
              className="caption mt-24"
              style={{ paddingTop: 16, borderTop: "1px dashed var(--stitch)" }}
            >
              Wrong email?{" "}
              <SwitchFlowButton
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                label="Go back"
              />
              .
            </div>
          </form>
        )}
      </div>
    </PortfolioShell>
  );
}

function FooterRow({
  submitting,
  submittingLabel,
  idleLabel,
}: {
  submitting: boolean;
  submittingLabel: string;
  idleLabel: string;
}) {
  return (
    <div className="flex between center" style={{ marginTop: 16, gap: 12, flexWrap: "wrap" }}>
      <button type="submit" className="btn btn-primary btn-arrow" disabled={submitting}>
        {submitting ? submittingLabel : idleLabel}
      </button>
      <Link className="btn btn-sm btn-ghost" href="/">
        Back to landing
      </Link>
    </div>
  );
}

function SwitchFlowButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        color: "var(--accent-2)",
        fontWeight: 600,
        textDecoration: "underline",
        textDecorationStyle: "dashed",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
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
      {message}
    </div>
  );
}

function humanCodeError(message: string): string {
  if (/InvalidSecret|invalid.*token/i.test(message)) {
    return "That code didn't match. Check your email or request a new one.";
  }
  if (/expired/i.test(message)) {
    return "That code has expired. Go back and request a new one.";
  }
  return message || "Could not verify code. Try again.";
}
