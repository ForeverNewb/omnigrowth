const KPIS = [
  { label: "Reach · 30d", value: "612.4K", trend: "+18.2%", dir: "up" as const },
  { label: "Engagement rate", value: "9.1%", trend: "+1.1 pp", dir: "up" as const },
  { label: "Click-through", value: "3.4%", trend: "−0.2 pp", dir: "down" as const },
  { label: "Followers gained", value: "2,184", trend: "+412 vs last", dir: "up" as const },
];

export function AnalyticsKPIs() {
  return (
    <div className="grid-4">
      {KPIS.map((k) => (
        <div key={k.label} className="kpi">
          <div className="kpi-label">{k.label}</div>
          <div className="kpi-value tabular">{k.value}</div>
          <div className={`kpi-trend ${k.dir}`}>{k.trend}</div>
        </div>
      ))}
    </div>
  );
}
