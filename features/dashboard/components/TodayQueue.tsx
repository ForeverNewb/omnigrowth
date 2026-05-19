const QUEUE = [
  {
    time: "09:00",
    platform: "LinkedIn",
    pfClass: "pf-li",
    text: "We’re live on Product Hunt today. Three drafts to choose from — pick the one that sings to your audience.",
    status: "scheduled" as const,
  },
  {
    time: "11:30",
    platform: "X / Twitter",
    pfClass: "pf-x",
    text: "Marketing teams: brief once, ship everywhere. Early access is open — link in bio.",
    status: "review" as const,
  },
  {
    time: "14:15",
    platform: "Instagram",
    pfClass: "pf-ig",
    text: "Quiet feature drop: brand voices stitched into every draft. Try them in the Generator.",
    status: "scheduled" as const,
  },
  {
    time: "17:00",
    platform: "Facebook",
    pfClass: "pf-fb",
    text: "Customer story: Northpine cut planning time from 3 hours to 25 minutes per week.",
    status: "draft" as const,
  },
];

export function TodayQueue() {
  return (
    <section className="card-pad" aria-labelledby="today-queue-title">
      <div className="card-eyebrow">
        <span id="today-queue-title">
          <span className="num-tag">▦ 04</span>Today&apos;s queue
        </span>
        <a href="#" className="caption" style={{ color: "var(--accent-red)", fontWeight: 600 }}>
          Open calendar →
        </a>
      </div>
      <ul className="queue-list">
        {QUEUE.map((item) => (
          <li key={item.time + item.platform} className="queue-row">
            <span className="queue-time tabular">{item.time}</span>
            <div>
              <div className={`queue-meta ${item.pfClass}`}>
                <span className="pf-dot" />
                {item.platform}
              </div>
              <div className="queue-text">{item.text}</div>
            </div>
            <span className={`status-pill ${item.status}`}>{item.status}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
