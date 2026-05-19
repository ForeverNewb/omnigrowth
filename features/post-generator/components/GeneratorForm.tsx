"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useState } from "react";

const CHANNELS: { code: string; label: string }[] = [
  { code: "x", label: "X (Twitter)" },
  { code: "li", label: "LinkedIn" },
  { code: "ig", label: "Instagram" },
  { code: "fb", label: "Facebook" },
  { code: "tt", label: "TikTok" },
  { code: "yt", label: "YouTube" },
  { code: "th", label: "Threads" },
  { code: "pi", label: "Pinterest" },
];

const TONES = ["warm", "dry", "bold"] as const;

export function GeneratorForm({ brandId }: { brandId: Id<"brand_profiles"> }) {
  const generate = useAction(api.postGenerator.generate.generate);
  const [brief, setBrief] = useState("");
  const [channel, setChannel] = useState("x");
  const [tone, setTone] = useState<(typeof TONES)[number]>("warm");
  const [pending, setPending] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setDraftId(null);
    try {
      const result = await generate({ brandId, brief, channel, tone });
      setDraftId(result.draftId);
    } catch (err) {
      const code = (err as { data?: { code?: string } })?.data?.code ?? String(err);
      setError(code);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-pad" style={{ display: "grid", gap: 16 }}>
      <label>
        Brief
        <textarea
          required
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          placeholder="One or two sentences describing what to post about"
        />
      </label>
      <label>
        Channel
        <select value={channel} onChange={(e) => setChannel(e.target.value)}>
          {CHANNELS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Tone
        <select value={tone} onChange={(e) => setTone(e.target.value as (typeof TONES)[number])}>
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={pending || brief.length === 0} className="btn btn-primary">
        {pending ? "Generating..." : "Generate"}
      </button>
      {error && <p style={{ color: "var(--danger, #b00)" }}>Error: {error}</p>}
      {draftId && <p>Draft created: {draftId}</p>}
    </form>
  );
}
