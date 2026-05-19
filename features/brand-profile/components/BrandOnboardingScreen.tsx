"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  onCreated: (brandId: Id<"brand_profiles">) => void;
}

interface QuotaError {
  code: "BRAND_QUOTA_EXCEEDED";
  limit: number;
  tier: "free" | "pro" | "agency";
}

function isQuotaError(data: unknown): data is QuotaError {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { code?: string }).code === "BRAND_QUOTA_EXCEEDED"
  );
}

type Mode = "light" | "dark";

const THEMES = {
  light: {
    appBg: "#EDE0C2",
    cardBg: "#FAF1DD",
    cardBorder: "rgba(58, 36, 24, 0.12)",
    inputBg: "#FFFAEC",
    inputBorder: "rgba(58, 36, 24, 0.18)",
    inputBorderFocus: "#6B3A1F",
    text: "#3A2418",
    textSoft: "rgba(58, 36, 24, 0.66)",
    textMuted: "rgba(58, 36, 24, 0.48)",
    rule: "rgba(58, 36, 24, 0.18)",
    accent: "#7A3E1D",
    accentText: "#FAF1DD",
    chip: "rgba(122, 62, 29, 0.08)",
    chipText: "#7A3E1D",
    avatarFromFallback: "#C9A074",
    avatarToFallback: "#7A3E1D",
    error: "#C04A2B",
    focusRing: "rgba(122, 62, 29, 0.10)",
    cardShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 24px 48px -28px rgba(58,36,24,0.18)",
    markShadow: "0 1px 0 rgba(255,255,255,0.5) inset, 0 8px 20px rgba(58,36,24,0.12)",
    markRing: "rgba(58,36,24,0.10)",
    markText: "#FAF1DD",
  },
  dark: {
    appBg: "#2A1810",
    cardBg: "#3A2418",
    cardBorder: "rgba(242, 231, 204, 0.10)",
    inputBg: "#1F110A",
    inputBorder: "rgba(242, 231, 204, 0.14)",
    inputBorderFocus: "#E0B989",
    text: "#F2E7CC",
    textSoft: "rgba(242, 231, 204, 0.66)",
    textMuted: "rgba(242, 231, 204, 0.42)",
    rule: "rgba(242, 231, 204, 0.14)",
    accent: "#E0B989",
    accentText: "#2A1810",
    chip: "rgba(224, 185, 137, 0.12)",
    chipText: "#E0B989",
    avatarFromFallback: "#6B3A1F",
    avatarToFallback: "#E0B989",
    error: "#E78A6F",
    focusRing: "rgba(224, 185, 137, 0.12)",
    cardShadow: "0 1px 0 rgba(255,255,255,0.03) inset, 0 24px 48px -24px rgba(0,0,0,0.55)",
    markShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 8px 24px rgba(0,0,0,0.35)",
    markRing: "rgba(242,231,204,0.10)",
    markText: "#1A0E08",
  },
} as const;

const SUGGESTIONS = ["Lumen Botanicals", "Northwind Coffee", "Atlas Studio"];
const MAX_LEN = 32;
const MIN_LEN = 2;

// Reads the current theme by observing <html>'s class list. The app toggles
// `theme-paper` / `theme-leather` on <html> via ThemeToggle.
function useMode(): Mode {
  const [mode, setMode] = useState<Mode>("light");
  useEffect(() => {
    const root = document.documentElement;
    const read = (): Mode => (root.classList.contains("theme-leather") ? "dark" : "light");
    setMode(read());
    const obs = new MutationObserver(() => setMode(read()));
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return mode;
}

function BrandMark({ name, mode }: { name: string; mode: Mode }) {
  const theme = THEMES[mode];
  const trimmed = name.trim();
  const initials = trimmed
    ? trimmed
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "";

  const hue = trimmed
    ? Math.abs([...trimmed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 360
    : null;

  const L1 = mode === "dark" ? 0.62 : 0.48;
  const L2 = mode === "dark" ? 0.42 : 0.72;
  const fromBg = hue == null ? theme.avatarFromFallback : `oklch(${L2} 0.10 ${hue})`;
  const toBg = hue == null ? theme.avatarToFallback : `oklch(${L1} 0.13 ${(hue + 40) % 360})`;

  return (
    <div
      style={{
        position: "relative",
        width: 88,
        height: 88,
        borderRadius: 22,
        background: `linear-gradient(135deg, ${fromBg}, ${toBg})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: theme.markText,
        fontFamily: 'var(--font-serif), "Source Serif 4", Georgia, serif',
        fontWeight: 600,
        fontSize: 32,
        letterSpacing: "-0.02em",
        boxShadow: theme.markShadow,
        transition:
          "background 420ms cubic-bezier(.2,.7,.2,1), transform 420ms cubic-bezier(.2,.7,.2,1)",
        flexShrink: 0,
      }}
    >
      {initials || (
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: mode === "dark" ? "rgba(26,14,8,0.55)" : "rgba(250,241,221,0.7)",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: 23,
          border: `1px solid ${theme.markRing}`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

export function BrandOnboardingScreen({ onCreated }: Props) {
  const mode = useMode();
  const theme = THEMES[mode];
  const create = useMutation(api.brandProfile.brands.create);

  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const count = name.length;
  const trimmed = name.trim();
  const valid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const brandId = await create({ name: trimmed });
      onCreated(brandId);
    } catch (err) {
      const data = (err as { data?: unknown }).data;
      if (isQuotaError(data)) {
        setError(
          `You've reached your ${data.tier}-tier limit of ${data.limit} brand${
            data.limit === 1 ? "" : "s"
          }. Upgrade in Settings → Billing to add more.`,
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not create brand.");
      }
      setSubmitting(false);
    }
  };

  const ringColor = focused ? theme.inputBorderFocus : theme.inputBorder;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.appBg,
        color: theme.text,
        padding: "56px 24px 72px",
        display: "flex",
        justifyContent: "center",
        transition: "background 200ms ease, color 200ms ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div
          style={{
            background: theme.cardBg,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 20,
            padding: "44px 48px",
            boxShadow: theme.cardShadow,
            display: "flex",
            flexDirection: "column",
            gap: 32,
          }}
        >
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <BrandMark name={name} mode={mode} />
            <div style={{ flex: 1, paddingTop: 4 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: 11,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: theme.chipText,
                  marginBottom: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: theme.chip,
                  padding: "5px 10px",
                  borderRadius: 999,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: theme.accent,
                  }}
                />
                Name your first brand
              </div>
              <h1
                style={{
                  fontFamily: 'var(--font-serif), "Source Serif 4", Georgia, serif',
                  fontWeight: 500,
                  fontSize: 34,
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                  color: theme.text,
                  margin: 0,
                  textWrap: "balance",
                }}
              >
                What should we call your brand?
              </h1>
              <p
                style={{
                  fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: theme.textSoft,
                  margin: "10px 0 0",
                  maxWidth: 460,
                  textWrap: "pretty",
                }}
              >
                Brands keep your channels, posts, and analytics separate. You can add more brands or
                rename this one any time.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: theme.textMuted,
              }}
            >
              <label htmlFor="brand-name">Brand name</label>
              <span
                style={{
                  color: count > MAX_LEN ? theme.error : theme.textMuted,
                }}
              >
                {count}/{MAX_LEN}
              </span>
            </div>

            <div
              style={{
                position: "relative",
                background: theme.inputBg,
                border: `1px solid ${ringColor}`,
                borderRadius: 12,
                padding: "16px 18px",
                transition: "border-color 160ms ease, box-shadow 160ms ease",
                boxShadow: focused ? `0 0 0 4px ${theme.focusRing}` : "none",
              }}
            >
              <input
                ref={inputRef}
                id="brand-name"
                value={name}
                maxLength={MAX_LEN + 8}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="e.g. Lumen Botanicals"
                disabled={submitting}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontFamily: 'var(--font-serif), "Source Serif 4", Georgia, serif',
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                  color: theme.text,
                  padding: 0,
                  caretColor: theme.accent,
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: theme.textMuted,
                }}
              >
                Try
              </span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setName(s);
                    inputRef.current?.focus();
                  }}
                  style={{
                    fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
                    fontSize: 13,
                    color: theme.textSoft,
                    background: "transparent",
                    border: `1px solid ${theme.rule}`,
                    borderRadius: 999,
                    padding: "5px 12px",
                    cursor: "pointer",
                    transition: "all 140ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.chip;
                    e.currentTarget.style.color = theme.chipText;
                    e.currentTarget.style.borderColor = "transparent";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = theme.textSoft;
                    e.currentTarget.style.borderColor = theme.rule;
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
                  fontSize: 13,
                  color: theme.error,
                  background:
                    mode === "dark" ? "rgba(192, 74, 43, 0.10)" : "rgba(192, 74, 43, 0.08)",
                  border: `1px solid ${
                    mode === "dark" ? "rgba(192, 74, 43, 0.30)" : "rgba(192, 74, 43, 0.25)"
                  }`,
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                height: 1,
                background: theme.rule,
                margin: "12px 0 4px",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
                  fontSize: 13,
                  color: theme.textSoft,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke={theme.textMuted} strokeWidth="1.25" />
                  <path
                    d="M8 4.5v4M8 11h.01"
                    stroke={theme.textMuted}
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                </svg>
                <span>You can change this later in Workspace settings.</span>
              </div>

              <button
                type="submit"
                disabled={!valid || submitting}
                style={{
                  fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "0.005em",
                  color: theme.accentText,
                  background: theme.accent,
                  border: "none",
                  padding: "11px 20px",
                  borderRadius: 10,
                  cursor: valid && !submitting ? "pointer" : "not-allowed",
                  opacity: valid && !submitting ? 1 : 0.5,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "transform 120ms ease, filter 120ms ease",
                }}
                onMouseDown={(e) => {
                  if (valid && !submitting) e.currentTarget.style.transform = "translateY(1px)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {submitting ? "Creating…" : "Create brand"}
                {!submitting && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M3 7h8m0 0L7.5 3.5M11 7l-3.5 3.5"
                      stroke={theme.accentText}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          {[
            {
              k: "01",
              t: "Separate analytics",
              d: "Each brand gets its own dashboard.",
            },
            {
              k: "02",
              t: "Channel sandbox",
              d: "Connect socials per brand.",
            },
            {
              k: "03",
              t: "Voice & tone",
              d: "Train a unique voice for posts.",
            },
          ].map((b) => (
            <div
              key={b.k}
              style={{
                padding: "16px 18px",
                border: `1px solid ${theme.rule}`,
                borderRadius: 12,
                background: "transparent",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  color: theme.textMuted,
                  marginBottom: 8,
                }}
              >
                {b.k}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 2,
                }}
              >
                {b.t}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-sans), Inter, system-ui, sans-serif",
                  fontSize: 12,
                  color: theme.textSoft,
                  lineHeight: 1.5,
                }}
              >
                {b.d}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
