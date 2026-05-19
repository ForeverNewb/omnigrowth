type Status = "up" | "warn" | "flat";

type Channel = {
  key: string;
  label: string;
  color: string;
  connected: boolean;
  status?: Status;
  statusText?: string;
  lastPosted?: string;
  warn?: boolean;
};

const CHANNELS: Channel[] = [
  {
    key: "li",
    label: "LinkedIn",
    color: "#0A66C2",
    connected: true,
    status: "up",
    statusText: "↗ +24%",
    lastPosted: "2h",
  },
  {
    key: "x",
    label: "X / Twitter",
    color: "#1A1A1A",
    connected: true,
    status: "up",
    statusText: "↗ +12%",
    lastPosted: "5h",
  },
  {
    key: "ig",
    label: "Instagram",
    color: "#E1306C",
    connected: true,
    status: "warn",
    statusText: "⚠ token 3d",
    lastPosted: "1d",
    warn: true,
  },
  {
    key: "tt",
    label: "TikTok",
    color: "#25F4EE",
    connected: true,
    status: "up",
    statusText: "↗ +48%",
    lastPosted: "3d",
  },
  {
    key: "fb",
    label: "Facebook",
    color: "#1877F2",
    connected: true,
    statusText: "→ flat",
    lastPosted: "4d",
  },
  { key: "yt", label: "YouTube", color: "#FF0000", connected: false },
  { key: "th", label: "Threads", color: "#101010", connected: false },
  { key: "pi", label: "Pinterest", color: "#E60023", connected: false },
];

export function ChannelsRail() {
  return (
    <section className="card-pad" id="card-channels" aria-labelledby="channels-title">
      <div className="card-eyebrow">
        <span id="channels-title">
          <span className="num-tag">◉ 02</span>Channels
        </span>
        <a href="#" className="caption" style={{ color: "var(--accent-red)", fontWeight: 600 }}>
          manage →
        </a>
      </div>
      <div className="ch-list">
        {CHANNELS.map((c) => (
          <div key={c.key} className={`ch-row ${c.connected ? "" : "unconnected"}`}>
            <span className={`ch-state ${c.warn ? "warn" : c.connected ? "" : "off"}`} />
            <div className="ch-name">
              <span className="pf-dot" style={{ background: c.color }} />
              {c.label}
            </div>
            {c.connected ? (
              <>
                <span className={`ch-status ${c.status ?? ""}`}>{c.statusText}</span>
                <span className="ch-time">{c.lastPosted}</span>
              </>
            ) : (
              <>
                <button type="button" className="ch-connect">
                  Connect →
                </button>
                <span className="ch-time" />
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
