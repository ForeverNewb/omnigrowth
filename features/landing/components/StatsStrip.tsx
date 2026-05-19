export function StatsStrip() {
  return (
    <section className="shell mt-32">
      <div className="stats-strip">
        <div className="stat-cell">
          <div className="stat-label">Channels supported</div>
          <div className="stat-value tabular">08</div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">LLMs in rotation</div>
          <div className="stat-value tabular">05</div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Hours saved / week</div>
          <div className="stat-value tabular">
            12<span className="stat-trend">+42%</span>
          </div>
        </div>
        <div className="stat-cell">
          <div className="stat-label">Teams in beta</div>
          <div className="stat-value tabular">142</div>
        </div>
      </div>
    </section>
  );
}
