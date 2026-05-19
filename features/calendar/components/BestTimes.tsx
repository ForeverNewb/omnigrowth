import { BEST_TIMES } from "@/features/calendar/lib/calendar-data";

export function BestTimes() {
  return (
    <section className="card-pad mt-24" aria-labelledby="best-times-title">
      <div className="card-eyebrow">
        <span id="best-times-title">
          <span className="num-tag">B</span>Best times this week
        </span>
        <span>Last 90 days</span>
      </div>
      <div className="best-times-grid">
        {BEST_TIMES.map((bt) => (
          <div key={bt.day} className={`best-time ${bt.hot ? "hot" : ""}`}>
            <div className="bt-day">{bt.day}</div>
            <div className="bt-time">{bt.time}</div>
            <div className="bt-pf">
              <span className="pf-dot" style={{ background: bt.color }} />
              {bt.platform}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
