"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Draft = {
  platform: string;
  platformLabel: string;
  text: string;
  tokens: number;
  bits: number;
};

const SAMPLES: Draft[] = [
  {
    platform: "x",
    platformLabel: "X / Twitter",
    text: "Marketing teams: we built OmniGrowth so you can brief once and ship across every channel. Try it free in early access — no card.",
    tokens: 38,
    bits: 1,
  },
  {
    platform: "li",
    platformLabel: "LinkedIn",
    text: "Early access is open for marketing teams who post everywhere.\n\nOne brief → channel-ready drafts. One calendar. Real analytics.\n\nWe think you'll like it.",
    tokens: 64,
    bits: 1,
  },
  {
    platform: "ig",
    platformLabel: "Instagram",
    text: "Quietly opening early access. ✦\nOne workspace. Every channel.\nWritten with you, not at you.",
    tokens: 22,
    bits: 1,
  },
];

// Brief textarea cycles through these. Read-only on the demo so the loop
// keeps running; clicking the textarea jumps to the next one.
const DEMO_PROMPTS = [
  "Announce that we're opening early access for marketing teams. Friendly, no hype.",
  "Promote our Tuesday webinar on AI copywriting. Include a register CTA.",
  "Customer story: Northpine cut planning time from 3 hours to 25 minutes per week.",
];

const skeletonBar = (width: string) => ({
  height: 12,
  marginTop: 6,
  background: "rgba(80,50,10,.12)",
  borderRadius: 3,
  width,
});

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LiveDemo() {
  const [brief, setBrief] = useState(DEMO_PROMPTS[0]);
  const [tone, setTone] = useState<"warm" | "dry" | "bold">("warm");
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(["x", "li"]));
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [generating, setGenerating] = useState(false);

  // Typewriter machine. Refs (not state) so a click can interrupt mid-cycle
  // without re-running the mount effect or losing position.
  const idxRef = useRef(0);
  const charRef = useRef(DEMO_PROMPTS[0].length);
  const phaseRef = useRef<"pause" | "erase" | "type">("pause");
  const timeoutRef = useRef<number | null>(null);
  const tickRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const schedule = (ms: number) => {
      timeoutRef.current = window.setTimeout(tick, ms);
    };

    const tick = () => {
      if (phaseRef.current === "pause") {
        phaseRef.current = "erase";
        schedule(2500);
        return;
      }
      if (phaseRef.current === "erase") {
        const target = DEMO_PROMPTS[idxRef.current];
        if (charRef.current > 0) {
          charRef.current -= 1;
          setBrief(target.slice(0, charRef.current));
          schedule(12);
        } else {
          idxRef.current = (idxRef.current + 1) % DEMO_PROMPTS.length;
          phaseRef.current = "type";
          schedule(280);
        }
        return;
      }
      const target = DEMO_PROMPTS[idxRef.current];
      if (charRef.current < target.length) {
        charRef.current += 1;
        setBrief(target.slice(0, charRef.current));
        schedule(28);
      } else {
        phaseRef.current = "pause";
        schedule(2500);
      }
    };

    tickRef.current = tick;
    schedule(1800);
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      tickRef.current = null;
    };
  }, []);

  // Click the brief — interrupt mid-cycle, jump to next prompt, keep running.
  const skipToNextPrompt = () => {
    const tick = tickRef.current;
    if (!tick) return;
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    idxRef.current = (idxRef.current + 1) % DEMO_PROMPTS.length;
    charRef.current = 0;
    phaseRef.current = "type";
    setBrief("");
    timeoutRef.current = window.setTimeout(tick, 200);
  };

  const togglePlatform = (key: string) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const generate = () => {
    setGenerating(true);
    setDrafts(null);
    window.setTimeout(() => {
      setDrafts(SAMPLES);
      setGenerating(false);
    }, 900);
  };

  return (
    <section id="demo" className="shell mt-48">
      <div className="section-head">
        <div className="section-num">03 /</div>
        <h2 className="section-title">See how it works.</h2>
        <div className="section-aside">Demo · pre-baked drafts</div>
      </div>

      <div className="demo-block">
        <div className="demo-input">
          <div className="field">
            <label htmlFor="demo-prompt">Brief the AI</label>
            <textarea
              id="demo-prompt"
              value={brief}
              readOnly
              onClick={skipToNextPrompt}
              rows={4}
              style={{ caretColor: "transparent", cursor: "pointer" }}
              aria-label="Brief — demo, click to see the next example"
            />
          </div>

          <div className="chip-row mt-16">
            <span className="caption" style={{ marginRight: 8, alignSelf: "center" }}>
              Quick brief:
            </span>
            <button type="button" className="chip" onClick={skipToNextPrompt}>
              Webinar promo
            </button>
            <button type="button" className="chip" onClick={skipToNextPrompt}>
              Case study
            </button>
          </div>

          <div className="gen-controls mt-24">
            <fieldset className="gen-field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend>Tone</legend>
              <div className="chip-row">
                {(["warm", "dry", "bold"] as const).map((k) => (
                  <button
                    type="button"
                    key={k}
                    className={`chip ${tone === k ? "active" : ""}`}
                    onClick={() => setTone(k)}
                  >
                    {k[0].toUpperCase() + k.slice(1)}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="gen-field" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend>Channels</legend>
              <div className="platform-row">
                {[
                  { k: "x", label: "X", color: "#1A1A1A" },
                  { k: "li", label: "LinkedIn", color: "#0A66C2" },
                  { k: "ig", label: "Instagram", color: "#E1306C" },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.k}
                    className={`platform-toggle ${platforms.has(p.k) ? "on" : ""}`}
                    onClick={() => togglePlatform(p.k)}
                  >
                    <span className="pf-dot" style={{ background: p.color }} />
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="gen-actions">
            <button
              type="button"
              className="btn btn-primary btn-arrow"
              onClick={generate}
              disabled={generating}
            >
              {generating ? "Drafting…" : "See the drafts"}
            </button>
            <span className="caption" style={{ marginLeft: 8 }}>
              Demo · pre-made output
            </span>
          </div>
        </div>

        <div className="demo-output">
          <div className="flex between center mb-16">
            <div
              className="caption mono"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 700,
              }}
            >
              Drafts
            </div>
            <div className="caption mono">Pre-baked sample</div>
          </div>
          <div className="demo-out-list">
            {drafts === null && !generating && (
              <div className="empty">
                <span className="empty-num">DEMO / 00</span>
                Click <strong>See the drafts</strong> to watch how OmniGrowth turns one brief into
                channel-ready posts. Output below is pre-made for this demo — sign up to generate
                yours.
              </div>
            )}
            {generating &&
              [0, 1, 2].map((i) => (
                <div key={i} className="gen-card">
                  <div className="empty-num" style={{ height: 14, marginBottom: 8 }}>
                    Drafting…
                  </div>
                  <div style={skeletonBar("90%")} />
                  <div style={skeletonBar("70%")} />
                </div>
              ))}
            {drafts?.map((d, i) => (
              <div key={i} className="gen-card">
                <div className="gen-card-head">
                  <span className="gen-card-platform">{d.platformLabel}</span>
                  <span className="spark-chip">✦ AI</span>
                </div>
                <div className="gen-card-text">{d.text}</div>
                <div className="gen-card-foot">
                  <span className="quick-stat">~{d.tokens} tokens</span>
                  <span className="right">
                    <Link className="btn btn-sm btn-ghost btn-arrow" href="/login">
                      Sign up to use this
                    </Link>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
