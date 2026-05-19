"use client";

import { useState } from "react";

const ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "What is an OmniBit?",
    a: "A single in-app token. We bill the LLM providers (Claude, GPT, Gemini, Llama, Mistral) on the back end via OpenRouter and translate cost into a flat unit so you never have to convert dollars to tokens. Roughly: 1 OmniBit ≈ a typical short post draft. Carousels and videos cost more.",
  },
  {
    q: "Which models do you use, and can I pick?",
    a: "Claude, GPT, Gemini, Llama, and Mistral. The generator drafts with three by default so you can compare. Pin a favorite per studio if you'd rather not see badges.",
  },
  {
    q: "Can I just paste a post I already wrote?",
    a: "Yes. The compose drawer accepts manual text. Drop it on a date, pick channels, schedule. The AI is opt-in, not the only path.",
  },
  {
    q: "Which platforms are supported?",
    a: "X, LinkedIn, Instagram, Facebook, TikTok, YouTube Shorts, Threads, Pinterest. We add channels every quarter; tell us which one is missing.",
  },
  {
    q: "Do you generate images and videos too?",
    a: "Yes. Image, short vertical video, and multi-slide carousels — all from the same brief, all priced in OmniBits. You can replace any AI media with your own upload.",
  },
  {
    q: "Is my brand voice safe?",
    a: "Brand voices are studio-scoped. We never train on your content. You can purge any voice with one click and we hard-delete within 30 days.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="shell mt-48">
      <div className="section-head">
        <div className="section-num">07 /</div>
        <h2 className="section-title">Questions, answered.</h2>
        <div className="section-aside">Honest, short</div>
      </div>
      <div className="faq-list">
        {ITEMS.map((item, i) => (
          <div key={item.q} className={`faq-item ${open === i ? "open" : ""}`}>
            <button
              type="button"
              className="faq-q"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span>
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                {item.q}
              </span>
              <span className="toggle-icon">+</span>
            </button>
            <div className="faq-a">
              <div className="faq-a-inner">
                <div className="faq-a-text">{item.a}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
