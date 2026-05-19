const CHANNELS = [
  { name: "LinkedIn", color: "#0A66C2", reach: 240_300, engage: 11.2, share: 92 },
  { name: "X / Twitter", color: "#1A1A1A", reach: 168_900, engage: 6.8, share: 64 },
  { name: "Instagram", color: "#E1306C", reach: 132_400, engage: 8.4, share: 50 },
  { name: "TikTok", color: "#25F4EE", reach: 56_200, engage: 12.6, share: 22 },
  { name: "Facebook", color: "#1877F2", reach: 42_800, engage: 4.1, share: 16 },
  { name: "Threads", color: "#101010", reach: 18_400, engage: 7.2, share: 7 },
];

export function ChannelBars() {
  return (
    <section className="card-pad" aria-labelledby="channels-title">
      <div className="card-eyebrow">
        <span id="channels-title">
          <span className="num-tag">A</span>Reach by channel · 30d
        </span>
        <span>{CHANNELS.length} active</span>
      </div>
      <ul className="channel-bars">
        {CHANNELS.map((c) => (
          <li key={c.name}>
            <div className="cb-head">
              <span className="cb-name">
                <span className="pf-dot" style={{ background: c.color }} />
                {c.name}
              </span>
              <span className="cb-num tabular">{c.reach.toLocaleString()}</span>
            </div>
            <div className="cb-bar">
              <span style={{ width: `${c.share}%`, background: c.color }} />
            </div>
            <div className="cb-meta">
              <span>{c.engage}% engagement</span>
              <span>{c.share}% share of reach</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
