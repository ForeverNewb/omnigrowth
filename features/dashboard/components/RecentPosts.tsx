type Row = {
  post: string;
  channel: string;
  channelColor: string;
  published: string;
  reach: string;
  engage: string;
  ctr: string;
};

const ROWS: Row[] = [
  {
    post: "A short note on shipping v1.0 — three things we learned…",
    channel: "LinkedIn",
    channelColor: "#0A66C2",
    published: "Tue, 09:00",
    reach: "42,180",
    engage: "8.4%",
    ctr: "3.1%",
  },
  {
    post: "Quiet update: we cut social planning from 3 hours to 25 min…",
    channel: "X",
    channelColor: "#1A1A1A",
    published: "Tue, 12:30",
    reach: "12,840",
    engage: "6.2%",
    ctr: "1.8%",
  },
  {
    post: "\u201cWhat we shipped this spring\u201d — 5-slide carousel…",
    channel: "Instagram",
    channelColor: "#E1306C",
    published: "Mon, 17:00",
    reach: "18,402",
    engage: "9.1%",
    ctr: "2.4%",
  },
  {
    post: "\u201cHow a 4-person team plans 6 channels\u201d — 12s vertical…",
    channel: "TikTok",
    channelColor: "#25F4EE",
    published: "Sun, 19:30",
    reach: "240K",
    engage: "11.2%",
    ctr: "0.4%",
  },
  {
    post: "Workflow audit: the bottleneck nobody fixes…",
    channel: "LinkedIn",
    channelColor: "#0A66C2",
    published: "Fri, 09:30",
    reach: "31,402",
    engage: "7.1%",
    ctr: "2.8%",
  },
];

export function RecentPosts() {
  return (
    <section className="card-pad mt-32" aria-labelledby="recent-title">
      <div className="card-eyebrow">
        <span id="recent-title">
          <span className="num-tag">↗ 05</span>Recent posts
        </span>
        <a href="#" className="caption" style={{ color: "var(--accent-red)", fontWeight: 600 }}>
          All analytics →
        </a>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: "40%" }}>Post</th>
            <th>Channel</th>
            <th>Published</th>
            <th className="num">Reach</th>
            <th className="num">Engage</th>
            <th className="num">CTR</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) => (
            <tr key={i}>
              <td>
                <span className="td-post">{r.post}</span>
              </td>
              <td>
                <span className="td-channel">
                  <span className="pf-dot" style={{ background: r.channelColor }} />
                  {r.channel}
                </span>
              </td>
              <td>{r.published}</td>
              <td className="num">{r.reach}</td>
              <td className="num">{r.engage}</td>
              <td className="num">{r.ctr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
