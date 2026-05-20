"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useState } from "react";

const CHANNELS = [
  { code: "x", label: "X", color: "#1A1A1A" },
  { code: "li", label: "LinkedIn", color: "#0A66C2" },
  { code: "ig", label: "Instagram", color: "#E1306C" },
  { code: "fb", label: "Facebook", color: "#1877F2" },
  { code: "tt", label: "TikTok", color: "#25F4EE" },
  { code: "yt", label: "YouTube", color: "#FF0000" },
  { code: "th", label: "Threads", color: "#101010" },
  { code: "pi", label: "Pinterest", color: "#E60023" },
] as const;

const TONES = [
  { code: "warm", label: "Warm" },
  { code: "dry", label: "Dry" },
  { code: "bold", label: "Bold" },
] as const;

type Tone = (typeof TONES)[number]["code"];

const MEDIA_TYPES = [
  { code: "text", label: "Text", enabled: true },
  { code: "image", label: "Image", enabled: false },
  { code: "carousel", label: "Carousel", enabled: false },
  { code: "video", label: "Video", enabled: false },
] as const;

const MAX_BRIEF = 1000;

interface BriefPanelProps {
  brandId: Id<"brand_profiles">;
  brandVoice?: string | null;
  onDraftCreated: (draftId: string) => void;
}

export function BriefPanel({ brandId, brandVoice, onDraftCreated }: BriefPanelProps) {
  const generate = useAction(api.postGenerator.generate.generate);

  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState<Tone>("warm");
  const [channel, setChannel] = useState("x");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!brief.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await generate({ brandId, brief, channel, tone });
      onDraftCreated(result.draftId);
      // don't clear brief — user may want to tweak and regenerate
    } catch (err) {
      const code = (err as { data?: { code?: string } })?.data?.code ?? String(err);
      setError(code);
    } finally {
      setPending(false);
    }
  }

  function onClear() {
    setBrief("");
    setError(null);
  }

  return (
    <section className="card-pad brief-card">
      <div className="card-eyebrow">
        <span>
          <span className="num-tag">01</span>Brief
        </span>
        {brandVoice && <span className="caption mono">{brandVoice}</span>}
      </div>

      <form onSubmit={onSubmit}>
        {/* Textarea */}
        <div className="brief-textarea-wrap">
          <textarea
            className="brief-textarea"
            id="brief-text"
            placeholder="What's this post about? (e.g. Tease our Friday product launch — version 1.0 is live. Friendly, no hype. Mention early-access link.)"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            maxLength={MAX_BRIEF}
            rows={5}
          />
          <span className="brief-counter">
            {brief.length} / {MAX_BRIEF}
          </span>
        </div>

        {/* Media type + Tone row */}
        <div className="brief-row" style={{ marginTop: 14 }}>
          <div className="brief-field">
            <span className="brief-field-label">Media type</span>
            <div className="chip-row">
              {MEDIA_TYPES.map((mt) =>
                mt.enabled ? (
                  <button key={mt.code} type="button" className="chip active" aria-pressed="true">
                    {mt.label}
                  </button>
                ) : (
                  <button
                    key={mt.code}
                    type="button"
                    className="chip"
                    disabled
                    aria-disabled="true"
                    style={{ opacity: 0.45, cursor: "not-allowed" }}
                  >
                    {mt.label}{" "}
                    <span style={{ marginLeft: 4, fontSize: 9, color: "var(--ink-3)" }}>soon</span>
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="brief-field">
            <span className="brief-field-label">Tone</span>
            <div className="chip-row">
              {TONES.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  className={`chip${tone === t.code ? " active" : ""}`}
                  aria-pressed={tone === t.code}
                  onClick={() => setTone(t.code)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Channel row */}
        <div className="brief-row full" style={{ marginTop: 14 }}>
          <div className="brief-field">
            <span className="brief-field-label">Channels</span>
            <div className="platform-row">
              {CHANNELS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`platform-toggle${channel === c.code ? " on" : ""}`}
                  aria-pressed={channel === c.code}
                  onClick={() => setChannel(c.code)}
                >
                  <span className="pf-dot" style={{ background: c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CTA row */}
        <div className="generate-row">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || brief.trim().length === 0}
          >
            {pending && (
              <span
                style={{
                  display: "inline-block",
                  width: 12,
                  height: 12,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                  marginRight: 2,
                }}
              />
            )}
            {pending ? "Generating…" : "Generate draft"}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClear}
            disabled={pending}
          >
            Clear
          </button>
          {error && (
            <span className="gen-error-chip" role="alert">
              ✕ {error}
            </span>
          )}
        </div>

        <p className="generate-hint">Draft ready in ~5–10 seconds.</p>
      </form>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
