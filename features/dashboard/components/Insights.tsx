const INSIGHTS = [
  {
    glyph: "✦",
    title: "LinkedIn carousels are punching above their weight.",
    body: "Your last 5 carousels averaged 3.4x more saves than text-only posts. Consider making one this week.",
  },
  {
    glyph: "↗",
    title: "Tuesdays at 10am keep working.",
    body: "Engagement is 28% higher than your weekly average for posts shipped in that window.",
  },
  {
    glyph: "Δ",
    title: "Drop the ‘exciting news’ opener.",
    body: "Posts that start with it underperform by 19% across X and LinkedIn over the last 30 days.",
  },
];

export function Insights() {
  return (
    <section className="card-pad" aria-labelledby="insights-title">
      <div className="card-eyebrow">
        <span id="insights-title">
          <span className="num-tag">04</span>Insights worth reading
        </span>
        <span>Last 30 days</span>
      </div>
      <ul className="insight-list">
        {INSIGHTS.map((it) => (
          <li key={it.title} className="insight-item">
            <span className="insight-icon">{it.glyph}</span>
            <div>
              <div className="insight-title">{it.title}</div>
              <div className="insight-body">{it.body}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
