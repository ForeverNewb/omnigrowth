// Small inline SVG sparkline for OmniBits consumed across the cycle.
// Mock data — real chart wires up after metering lands.

const POINTS = [120, 180, 90, 240, 320, 280, 360, 220, 410, 380, 460, 420, 510, 480];

export function BitsChart() {
  const w = 720;
  const h = 220;
  const max = Math.max(...POINTS) * 1.15;
  const stepX = w / (POINTS.length - 1);

  const path = POINTS.map((v, i) => {
    const x = i * stepX;
    const y = h - (v / max) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  const areaPath = `${path} L${w} ${h} L0 ${h} Z`;

  return (
    <section className="chart-card" aria-labelledby="bits-chart-title">
      <h3 id="bits-chart-title">
        <span>
          <span className="num">A /</span>OmniBits consumed
        </span>
        <span className="caption tabular">14-day rolling</span>
      </h3>
      <div className="chart-legend">
        <span>
          <span className="dot" style={{ background: "#9C6F1E" }} />
          Bits used / day
        </span>
        <span className="muted">Cycle ends 2026-06-01</span>
      </div>
      <div className="chart-host">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          role="img"
          aria-label="OmniBits consumed over 14 days"
        >
          <defs>
            <linearGradient id="bits-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#C97B3F" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#C97B3F" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1="0"
              x2={w}
              y1={h * p}
              y2={h * p}
              stroke="rgba(101,72,32,0.20)"
              strokeDasharray="2 4"
              strokeWidth="1"
            />
          ))}
          <path d={areaPath} fill="url(#bits-area)" />
          <path
            d={path}
            fill="none"
            stroke="#9C6F1E"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {POINTS.map((v, i) => (
            <circle
              key={i}
              cx={i * stepX}
              cy={h - (v / max) * h}
              r="3"
              fill="#FFF1B0"
              stroke="#9C6F1E"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>
    </section>
  );
}
