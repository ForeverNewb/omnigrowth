type Cell = { level: 0 | 1 | 2 | 3; label: string; now?: boolean };

const ROWS: { key: string; color: string; label: string; cells: Cell[] }[] = [
  {
    key: "x",
    label: "X",
    color: "#1A1A1A",
    cells: [
      { level: 2, label: "1.6×" },
      { level: 3, label: "2.4×" },
      { level: 1, label: "1.1×" },
      { level: 2, label: "1.7×" },
      { level: 3, label: "2.8×", now: true },
      { level: 0, label: "—" },
      { level: 1, label: "1.0×" },
    ],
  },
  {
    key: "li",
    label: "LinkedIn",
    color: "#0A66C2",
    cells: [
      { level: 2, label: "1.8×" },
      { level: 3, label: "3.0×" },
      { level: 2, label: "1.7×" },
      { level: 1, label: "1.2×" },
      { level: 1, label: "1.1×" },
      { level: 0, label: "—" },
      { level: 0, label: "—" },
    ],
  },
  {
    key: "ig",
    label: "Instagram",
    color: "#E1306C",
    cells: [
      { level: 1, label: "1.0×" },
      { level: 2, label: "1.5×" },
      { level: 1, label: "1.2×" },
      { level: 3, label: "2.6×" },
      { level: 2, label: "1.8×" },
      { level: 2, label: "1.6×" },
      { level: 1, label: "1.1×" },
    ],
  },
  {
    key: "tt",
    label: "TikTok",
    color: "#25F4EE",
    cells: [
      { level: 0, label: "—" },
      { level: 1, label: "1.1×" },
      { level: 2, label: "1.7×" },
      { level: 2, label: "1.6×" },
      { level: 3, label: "3.1×" },
      { level: 3, label: "2.9×" },
      { level: 2, label: "1.5×" },
    ],
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function cellClass(level: number, now?: boolean) {
  const base = level > 0 ? `hm-cell l${level}` : "hm-cell";
  return now ? `${base} now` : base;
}

export function WhenToPost() {
  return (
    <section className="card-pad" id="card-heatmap" aria-labelledby="heatmap-title">
      <div className="card-eyebrow">
        <span id="heatmap-title">
          <span className="num-tag">◷ 03</span>When to post
        </span>
        <span className="caption" style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
          next 7 days
        </span>
      </div>
      <div>
        <div className="hm-hint">Click a hot cell to schedule into that window.</div>
        <div className="hm-wrap">
          <div className="hm-grid">
            <div />
            {DAYS.map((d) => (
              <div className="hm-day" key={d}>
                {d}
              </div>
            ))}
            {ROWS.map((row) => (
              <div key={row.key} style={{ display: "contents" }}>
                <div className="hm-row-label">
                  <span className="pf-dot" style={{ background: row.color }} />
                  {row.label}
                </div>
                {row.cells.map((c, i) => (
                  <div key={i} className={cellClass(c.level, c.now)}>
                    {c.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="hm-legend">
            <span>
              <span className="hm-swatch" style={{ background: "rgba(45,138,77,0.18)" }} />
              faint
            </span>
            <span>
              <span className="hm-swatch" style={{ background: "rgba(45,138,77,0.40)" }} />
              medium
            </span>
            <span>
              <span
                className="hm-swatch"
                style={{ background: "linear-gradient(135deg,#2D8A4D,#1F6B3D)" }}
              />
              strong = 1.5–3× baseline
            </span>
          </div>
        </div>
        <div className="hm-foot">
          <div className="hm-foot-meta">
            Best window: <strong>Fri 10:00 · LinkedIn</strong>
          </div>
          <button type="button" className="btn btn-sm btn-primary btn-arrow">
            Plan the week
          </button>
        </div>
      </div>
    </section>
  );
}
