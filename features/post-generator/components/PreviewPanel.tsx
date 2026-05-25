"use client";

import type { Doc } from "@/convex/_generated/dataModel";

const CHANNEL_META: Record<string, { label: string; color: string }> = {
  x: { label: "X / Twitter", color: "#1A1A1A" },
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

interface PreviewPanelProps {
  draft: Doc<"postgen_drafts"> | null;
}

export function PreviewPanel({ draft }: PreviewPanelProps) {
  const channelInfo = draft
    ? (CHANNEL_META[draft.channel] ?? { label: draft.channel, color: "#8A7551" })
    : null;
  const charCount = draft?.text?.length ?? 0;

  return (
    <section className="card-pad preview-card">
      <div className="preview-head">
        <span className="left">
          <span className="num-tag">02</span>Preview
        </span>
        <span className="caption mono" style={{ color: "var(--ink-3)" }}>
          {draft ? `Draft · ${charCount} chars` : "No draft yet"}
        </span>
      </div>

      <div className="preview-body">
        {!draft ? (
          /* Empty state */
          <div className="preview-empty">
            <span className="empty-num">EMPTY / 00</span>
            <div className="empty-glyph">✒</div>
            <h3>
              Brief the AI, see the <em>drafts</em>.
            </h3>
            <p>
              Type what this post is about, pick a channel and tone, then hit Generate. We&apos;ll
              show drafts here in seconds.
            </p>
          </div>
        ) : (
          /* Draft view */
          <div className="preview-draft-wrap">
            {channelInfo && (
              <div className="preview-draft-channel">
                <span
                  className="pf-dot"
                  style={{ background: channelInfo.color, width: 8, height: 8 }}
                />
                {channelInfo.label}
              </div>
            )}

            <p className="preview-draft-text">{draft.text ?? "(No text generated)"}</p>

            <div className="preview-draft-foot">
              <span>{charCount} chars</span>
              <span className="tone-tag">{draft.tone}</span>
              <span>{formatTimestamp(draft.createdAt)}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
