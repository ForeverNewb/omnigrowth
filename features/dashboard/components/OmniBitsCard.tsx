import { getBalance } from "@/lib/omnibits";

export function OmniBitsCard() {
  const balance = getBalance();
  const usedPct = Math.round((balance.used / balance.total) * 100);

  return (
    <section className="card-pad" aria-labelledby="bits-title">
      <div className="card-eyebrow">
        <span id="bits-title">
          <span className="num-tag">03</span>OmniBits &middot; this cycle
        </span>
        <span className="spark-chip">✦</span>
      </div>
      <div className="kpi-label">Remaining</div>
      <div className="kpi-value tabular">
        {balance.remaining.toLocaleString()}
        <span className="stat-trend"> /{balance.total.toLocaleString()}</span>
      </div>
      <div className="progress mt-16">
        <span style={{ width: `${usedPct}%` }} />
      </div>
      <div className="kpi-trend mt-8">
        Used <strong>{usedPct}%</strong> · cycle ends {balance.cycleEnd}
      </div>
      <div className="mt-16 flex gap-8" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn btn-sm btn-ghost">
          Top up
        </button>
        <button type="button" className="btn btn-sm btn-ghost">
          See breakdown
        </button>
      </div>
    </section>
  );
}
