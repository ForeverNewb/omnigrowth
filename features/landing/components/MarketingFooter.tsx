import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer-grid">
          <div>
            <div className="brand">
              <span className="brand-mark" />
              OmniGrowth
            </div>
            <p className="caption mt-16" style={{ maxWidth: "32ch" }}>
              A quiet workspace for marketing teams who post everywhere. Generate, schedule,
              measure.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li>
                <Link href="/dash">Open app</Link>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <a href="#">About</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#">Press</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li>
                <a href="#">Brand voices</a>
              </li>
              <li>
                <a href="#">Templates</a>
              </li>
              <li>
                <a href="#">Status</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="#">Privacy</a>
              </li>
              <li>
                <a href="#">Terms</a>
              </li>
              <li>
                <a href="#">DPA</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-base">
          <span>© 2026 OmniGrowth. Made for marketing teams who post everywhere.</span>
          <span className="mono">v1.0.0 / build 26.05</span>
        </div>
      </div>
    </footer>
  );
}
