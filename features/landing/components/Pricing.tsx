import Link from "next/link";

export function Pricing() {
  return (
    <section id="pricing" className="shell mt-48">
      <div className="section-head">
        <div className="section-num">06 /</div>
        <h2 className="section-title">Pricing without asterisks.</h2>
        <div className="section-aside">Pay-as-you-use OmniBits</div>
      </div>
      <div className="pricing">
        <div className="price">
          <div className="price-name">Solo</div>
          <div className="price-amount">
            <sup>$</sup>19<sub>/mo</sub>
          </div>
          <p className="caption">For freelancers and side projects.</p>
          <ul className="price-feat">
            <li>1 studio, 3 channels</li>
            <li>1,000 OmniBits / mo</li>
            <li>Calendar &amp; basic analytics</li>
            <li>Email support</li>
          </ul>
          <Link className="btn btn-ghost" href="/login">
            Start solo
          </Link>
        </div>
        <div className="price featured">
          <div className="price-name">Studio</div>
          <div className="price-amount">
            <sup>$</sup>49<sub>/seat / mo</sub>
          </div>
          <p className="caption">Most marketing teams pick this.</p>
          <ul className="price-feat">
            <li>All 8 channels</li>
            <li>10,000 OmniBits / mo</li>
            <li>Approvals &amp; brand voices</li>
            <li>Client report exports</li>
            <li>Priority support</li>
          </ul>
          <Link className="btn btn-accent btn-arrow" href="/login">
            Try Studio free
          </Link>
        </div>
        <div className="price">
          <div className="price-name">Agency</div>
          <div className="price-amount">Custom</div>
          <p className="caption">For studios managing 10+ clients.</p>
          <ul className="price-feat">
            <li>Multi-studio, white-label</li>
            <li>Unlimited OmniBits</li>
            <li>SSO &amp; audit log</li>
            <li>Dedicated CSM</li>
          </ul>
          <Link className="btn btn-ghost" href="/login">
            Talk to sales
          </Link>
        </div>
      </div>
    </section>
  );
}
