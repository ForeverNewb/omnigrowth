"use client";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  x: { label: "X", color: "#1A1A1A" },
  li: { label: "LinkedIn", color: "#0A66C2" },
  ig: { label: "Instagram", color: "#E1306C" },
  fb: { label: "Facebook", color: "#1877F2" },
  tt: { label: "TikTok", color: "#25F4EE" },
  yt: { label: "YouTube", color: "#FF0000" },
  th: { label: "Threads", color: "#101010" },
  pi: { label: "Pinterest", color: "#E60023" },
};

function formatTimestamp(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

type FilterKey = "all" | "text";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "text", label: "Text" },
];

interface HistoryRailProps {
  brandId: Id<"brand_profiles">;
  selectedDraftId: string | null;
  onSelect: (draft: Doc<"postgen_drafts">) => void;
}

export function HistoryRail({ brandId, selectedDraftId, onSelect }: HistoryRailProps) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const drafts = useQuery(api.postGenerator.drafts.listByBrand, { brandId, limit: 50 });

  const filtered =
    drafts === undefined
      ? undefined
      : filter === "all"
        ? drafts
        : drafts.filter((d) => d.mediaType === filter);

  const count = filtered?.length ?? 0;

  return (
    <aside className="history-rail">
      <div className="history-head">
        <h3>
          <span className="num-tag">03</span>History
        </h3>
        <span className="caption mono">
          {drafts === undefined ? "..." : `${count} draft${count !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="history-filter">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className={`mini-chip${filter === chip.key ? " on" : ""}`}
            onClick={() => setFilter(chip.key)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="history-list">
        {filtered === undefined ? null : filtered.length === 0 ? (
          <div className="history-empty">
            <span className="empty-num">EMPTY / 00</span>
            No drafts yet. Your brief is the start of something.
          </div>
        ) : (
          filtered.map((draft) => {
            const ch = CHANNEL_META[draft.channel] ?? { label: draft.channel, color: "#8A7551" };
            const isActive = draft._id === selectedDraftId;
            const preview = draft.text ? draft.text.slice(0, 120) : draft.brief.slice(0, 120);

            return (
              <button
                key={draft._id}
                type="button"
                className={`history-item${isActive ? " active" : ""}`}
                onClick={() => onSelect(draft)}
                aria-pressed={isActive}
              >
                <div className="history-thumb text" />
                <div className="history-body">
                  <div className="history-meta">
                    <span className="pf-dot" style={{ background: ch.color }} />
                    {ch.label}
                    <span>{"·"}</span>
                    {formatTimestamp(draft.createdAt)}
                  </div>
                  <div className="history-text">{preview}</div>
                  <div className="history-foot">
                    <span>{draft.text?.length ?? 0} chars</span>
                    <span style={{ color: "var(--brass-2)" }}>{"✦"} AI</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
