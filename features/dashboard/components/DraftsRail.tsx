const DRAFTS = [
  {
    title: "Webinar promo · Tuesday",
    body: "Tuesday at 10am: AI copywriting for marketing teams. Free seats are filling — register before Friday.",
    platforms: [{ color: "#0A66C2" }, { color: "#1A1A1A" }],
    model: "Claude",
    cls: "claude",
  },
  {
    title: "Product hunt launch",
    body: "We&rsquo;re live on Product Hunt. Three drafts to choose from — pick the one that sings to your audience.",
    platforms: [{ color: "#1A1A1A" }, { color: "#0A66C2" }, { color: "#E1306C" }],
    model: "GPT",
    cls: "gpt",
  },
  {
    title: "Quiet feature drop",
    body: "Custom brand voices are now stitched into every draft. Try them in the Generator without leaving today&rsquo;s queue.",
    platforms: [{ color: "#0A66C2" }],
    model: "Gemini",
    cls: "gemini",
  },
  {
    title: "Customer story · Northpine",
    body: "Northpine cut planning time from 3 hours to 25 minutes per week. Here&rsquo;s how it shows up in their calendar.",
    platforms: [{ color: "#0A66C2" }, { color: "#E1306C" }],
    model: "Claude",
    cls: "claude",
  },
];

export function DraftsRail() {
  return (
    <aside className="drafts-rail" aria-label="Drafts">
      <div className="drafts-rail-head">
        <span>Drafts &middot; today</span>
        <span>{DRAFTS.length}</span>
      </div>
      {DRAFTS.map((d, i) => (
        <div key={i} className="draft-card" draggable>
          <div className="draft-card-meta">
            <span>{d.title}</span>
            <span className={`llm-badge ${d.cls}`}>
              <span className="llm-dot" />
              {d.model}
            </span>
          </div>
          <div className="draft-card-text">{d.body}</div>
          <div className="draft-card-foot">
            {d.platforms.map((p, j) => (
              <span key={j} className="pf-dot" style={{ background: p.color }} />
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
