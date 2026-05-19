// Shared chrome for the auth pages (login + dev-login). Renders the leather
// portfolio with the marketing-style hero on the left and accepts an arbitrary
// right-side card via `children`.

import type { ReactNode } from "react";

export function PortfolioShell({ children }: { children: ReactNode }) {
  return (
    <div className="login-page">
      <div className="portfolio">
        <div className="portfolio-spine" />
        <div className="clasp clasp-top">
          <span className="pin" />
        </div>
        <div className="clasp clasp-bottom">
          <span className="pin" />
        </div>

        <div className="portfolio-left">
          <div className="portfolio-eyebrow">
            <span>OmniGrowth · Closed Beta</span>
            <span>v1.0 / R3</span>
          </div>
          <h1 className="portfolio-display">
            A quiet workspace
            <br />
            for <span className="accent">noisy channels.</span>
          </h1>
          <p className="portfolio-sub">
            Multi-LLM drafts, one calendar across every channel, and analytics that say what to make
            next. Paid in OmniBits.
          </p>
          <ul className="portfolio-bullets">
            <li>
              <span className="num">01</span>
              <span>
                <strong>Brief once.</strong> Get drafts from Claude, GPT, and Gemini side by side.
                Pick the one that sings.
              </span>
            </li>
            <li>
              <span className="num">02</span>
              <span>
                <strong>Drag &amp; schedule.</strong> One calendar across X, LinkedIn, Instagram,
                Facebook, TikTok, YouTube Shorts, Threads, Pinterest.
              </span>
            </li>
            <li>
              <span className="num">03</span>
              <span>
                <strong>Measure honestly.</strong> Per-channel reach, engagement, and the AI insight
                worth reading.
              </span>
            </li>
          </ul>
        </div>

        <div className="portfolio-right">{children}</div>
      </div>
    </div>
  );
}
