const WHY = [
  "Carousel format — your save-magnet, 3.4× the average",
  "Tuesday 10:00 hit your strongest LinkedIn window",
  "\u201cQuiet update\u201d opener — replies 2.3× your average",
];

export function Winner() {
  return (
    <section className="card-pad" id="card-winner" aria-labelledby="winner-title">
      <div className="card-eyebrow">
        <span id="winner-title">
          <span className="num-tag">✦ 01</span>Last week&apos;s winner
        </span>
        <span className="caption" style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
          7d · LinkedIn
        </span>
      </div>
      <div>
        <div className="winner-hero">
          <div className="winner-thumb">Carousel · 5 slides</div>
          <div>
            <div className="winner-channel">
              <span className="pf-dot" style={{ background: "#0A66C2" }} />
              LinkedIn · Tue 10:00
            </div>
            <div className="winner-metrics">
              <div>
                <div className="wm-num tabular">
                  1,247<em>+312% wow</em>
                </div>
                <div className="wm-label">saves</div>
              </div>
              <div>
                <div className="wm-num tabular">42.1k</div>
                <div className="wm-label">reach</div>
              </div>
            </div>
            <div className="winner-excerpt">
              &ldquo;A short note on shipping v1.0 — three things we learned in beta…&rdquo;
            </div>
          </div>
        </div>

        <div className="why-label">Why it worked</div>
        <div className="why-list">
          {WHY.map((reason, i) => (
            <div className="why-row" key={i}>
              <span className="why-num">{String(i + 1).padStart(2, "0")}</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>

        <div className="next-play">
          <button type="button" className="play-cta primary">
            <span className="play-eyebrow">Next play · A</span>
            <span className="play-title">
              Remix as X thread <span>→</span>
            </span>
          </button>
          <button type="button" className="play-cta">
            <span className="play-eyebrow">Next play · B</span>
            <span className="play-title">
              Repost in 30d as case study <span>→</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
