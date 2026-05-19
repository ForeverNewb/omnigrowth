import Link from "next/link";

export function CallToAction() {
  return (
    <section className="shell mt-48 mb-32">
      <div className="cta-block">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "end",
            position: "relative",
            zIndex: 1,
          }}
        >
          <h2 className="display">
            Stop juggling tabs.
            <br />
            <span className="accent">Start shipping posts.</span>
          </h2>
          <div>
            <p className="body-lg">
              Open OmniGrowth with your team free for 14 days. We import your last 30 days of posts
              so analytics work on day one.
            </p>
            <div className="hero-actions mt-16">
              <Link className="btn btn-primary btn-arrow" href="/login">
                Open the app
              </Link>
              <a className="btn btn-ghost" href="#demo">
                Try the demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
