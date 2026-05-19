import Link from "next/link";

export function Hero() {
  return (
    <section className="hero">
      <div className="shell">
        <div className="hero-meta">
          <span>OMNIGROWTH / 05 / 26</span>
          <span>
            <span className="live-dot" />
            Closed Beta — 142 teams writing right now
          </span>
          <span>v1.0 / R3</span>
        </div>
        <div className="hero-grid">
          <div>
            <h1 className="hero-display">
              Brief.
              <br />
              Draft.
              <br />
              <span className="red">Ship it.</span>
            </h1>
          </div>
          <div>
            <p className="hero-sub">
              An AI copywriter (powered by Claude, GPT, and Gemini together), a single calendar for
              every channel, and analytics that tell you what to make next. One quiet workspace.
              Paid in <span>OmniBits</span>.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary btn-arrow" href="/login">
                Open the app
              </Link>
              <a className="btn btn-ghost" href="#demo">
                Try the demo
              </a>
            </div>
            <div className="flex gap-16 mt-24" style={{ flexWrap: "wrap", alignItems: "center" }}>
              <span className="spark-chip lg">OmniBits 250 free on signup</span>
              <span className="caption">No card. Connect 8 channels in under a minute.</span>
            </div>
          </div>
        </div>

        <div className="logo-strip">
          <div className="logo-cell tall">Northpine</div>
          <div className="logo-cell">BlueRiver</div>
          <div className="logo-cell mono">ATLAS&amp;CO</div>
          <div className="logo-cell tall">Lumen</div>
          <div className="logo-cell">Foxglove</div>
          <div className="logo-cell mono">QUARTER/EIGHT</div>
        </div>
      </div>
    </section>
  );
}
