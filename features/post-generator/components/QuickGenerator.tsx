"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MEDIA_TYPES = ["Text", "Image", "Carousel", "Video"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const TONES = ["warm", "dry", "bold"] as const;
type Tone = (typeof TONES)[number];

// Auto-demo cycles through these prompts character-by-character. Loop runs
// only until the user touches anything in the panel — see stopDemo.
const DEMO_PROMPTS = [
  "Announce that we're opening early access for marketing teams. Friendly, no hype.",
  "Tease our new best-time-to-post analytics. Calm, useful, no exclamation marks.",
  "Friday wrap for LinkedIn — what we shipped, what we learned. Warm, brief.",
];

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function QuickGenerator() {
  const pathname = usePathname();
  const brandId = pathname.split("/")[3];

  const [brief, setBrief] = useState(DEMO_PROMPTS[0]);
  const [media, setMedia] = useState<MediaType>("Text");
  const [tone, setTone] = useState<Tone>("warm");
  const [platforms, setPlatforms] = useState<Set<string>>(new Set(["x", "li"]));
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<
    | null
    | {
        text: string;
        platform: string;
      }[]
  >(null);
  const [demoActive, setDemoActive] = useState(true);
  const demoActiveRef = useRef(true);
  demoActiveRef.current = demoActive;

  const stopDemo = () => setDemoActive(false);

  // Typewriter loop. Phase machine: type → pause → erase → next prompt.
  // Chained setTimeout (not setInterval) because each phase has its own tempo.
  useEffect(() => {
    if (!demoActive) return;
    if (prefersReducedMotion()) return;

    let cancelled = false;
    let idx = 0;
    let charIdx = DEMO_PROMPTS[0].length;
    let phase: "pause" | "erase" | "type" = "pause";

    const tick = () => {
      if (cancelled || !demoActiveRef.current) return;
      if (phase === "pause") {
        phase = "erase";
        window.setTimeout(tick, 2400);
        return;
      }
      if (phase === "erase") {
        if (charIdx > 0) {
          charIdx--;
          setBrief(DEMO_PROMPTS[idx].slice(0, charIdx));
          window.setTimeout(tick, 12);
        } else {
          idx = (idx + 1) % DEMO_PROMPTS.length;
          phase = "type";
          window.setTimeout(tick, 280);
        }
        return;
      }
      const target = DEMO_PROMPTS[idx];
      if (charIdx < target.length) {
        charIdx++;
        setBrief(target.slice(0, charIdx));
        window.setTimeout(tick, 28);
      } else {
        phase = "pause";
        window.setTimeout(tick, 2800);
      }
    };

    const start = window.setTimeout(tick, 2200);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [demoActive]);

  // Pill rotation — media + tone cycle on offset intervals.
  useEffect(() => {
    if (!demoActive) return;
    if (prefersReducedMotion()) return;

    const mediaInt = window.setInterval(() => {
      setMedia((prev) => MEDIA_TYPES[(MEDIA_TYPES.indexOf(prev) + 1) % MEDIA_TYPES.length]);
    }, 3300);
    const toneInt = window.setInterval(() => {
      setTone((prev) => TONES[(TONES.indexOf(prev) + 1) % TONES.length]);
    }, 4400);

    return () => {
      window.clearInterval(mediaInt);
      window.clearInterval(toneInt);
    };
  }, [demoActive]);

  const togglePlatform = (k: string) => {
    stopDemo();
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const generate = () => {
    stopDemo();
    setGenerating(true);
    setDrafts(null);
    window.setTimeout(() => {
      setDrafts([
        {
          text: "Marketing teams: we built OmniGrowth so you can brief once and ship everywhere. Try it free in early access — no card.",
          platform: "X / Twitter",
        },
        {
          text: "Quietly opening early access for marketing teams who post everywhere.\n\nOne brief → channel-ready drafts. One calendar. Real analytics.",
          platform: "LinkedIn",
        },
        {
          text: "Early access is open. ✦\nOne workspace. Every channel.\nWritten with you, not at you.",
          platform: "Instagram",
        },
      ]);
      setGenerating(false);
    }, 900);
  };

  return (
    <section className="card-pad" aria-labelledby="quick-gen-title">
      <div className="card-eyebrow">
        <span id="quick-gen-title">
          <span className="num-tag">01</span>Quick AI Post Generator
        </span>
        <span style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span>Demo</span>
          {brandId ? (
            <Link
              href={`/dash/b/${brandId}/generate`}
              className="caption"
              style={{ textDecoration: "none" }}
            >
              Open generator →
            </Link>
          ) : null}
        </span>
      </div>

      <div className="field">
        <label htmlFor="brief">Brief the AI</label>
        <textarea
          id="brief"
          value={brief}
          onChange={(e) => {
            stopDemo();
            setBrief(e.target.value);
          }}
          rows={3}
        />
      </div>

      <div className="gen-controls">
        <fieldset className="gen-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Media type</legend>
          <div className="chip-row">
            {MEDIA_TYPES.map((m) => (
              <button
                type="button"
                key={m}
                className={`chip ${media === m ? "active" : ""}`}
                onClick={() => {
                  stopDemo();
                  setMedia(m);
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="gen-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Tone</legend>
          <div className="chip-row">
            {TONES.map((t) => (
              <button
                type="button"
                key={t}
                className={`chip ${tone === t ? "active" : ""}`}
                onClick={() => {
                  stopDemo();
                  setTone(t);
                }}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset
          className="gen-field"
          style={{ gridColumn: "1 / -1", border: 0, padding: 0, margin: 0 }}
        >
          <legend>Channels</legend>
          <div className="platform-row">
            {[
              { k: "x", label: "X", color: "#1A1A1A" },
              { k: "li", label: "LinkedIn", color: "#0A66C2" },
              { k: "ig", label: "Instagram", color: "#E1306C" },
              { k: "fb", label: "Facebook", color: "#1877F2" },
              { k: "tt", label: "TikTok", color: "#25F4EE" },
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
          {generating ? "Generating…" : "Generate drafts"}
        </button>
        <span className="spark-chip">3 ✦ OmniBits</span>
        <span className="caption" style={{ marginLeft: "auto" }}>
          Drafts ready in ~5 seconds
        </span>
      </div>

      {drafts && (
        <div className="mt-24" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {drafts.map((d, i) => (
            <div key={i} className="gen-card">
              <div className="gen-card-head">
                <span className="gen-card-platform">{d.platform}</span>
                <span className="spark-chip">✦ AI</span>
              </div>
              <div className="gen-card-text">{d.text}</div>
              <div className="gen-card-foot">
                <span className="quick-stat">~{(d.text.length / 4) | 0} tokens</span>
                <span className="right">
                  <span className="spark-chip">1 ✦</span>
                  <button type="button" className="btn btn-sm btn-ghost btn-arrow">
                    Schedule
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
