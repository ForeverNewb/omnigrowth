import { getBalance } from "@/lib/omnibits";

export function WalletStrip() {
  const b = getBalance();
  const usedPct = Math.round((b.used / b.total) * 100);
  const drafts = Math.floor(b.remaining / 20);

  return (
    <section className="wallet-strip" aria-label="OmniBits wallet">
      <div className="ws-label">
        <span className="ws-star">✦</span>OmniBits
      </div>
      <div className="ws-balance tabular">
        {b.remaining.toLocaleString()}
        <em>remaining</em>
      </div>
      <div className="ws-divider" />
      <div className="ws-meta tabular">
        ≈ {drafts} drafts · used {b.used.toLocaleString()} / {b.total.toLocaleString()}
      </div>
      <div className="ws-progress">
        <span style={{ width: `${usedPct}%` }} />
      </div>
      <div className="ws-pct">{usedPct}% used</div>
      <div className="ws-divider" />
      <a href="#" className="ws-cta">
        Top up →
      </a>
    </section>
  );
}
