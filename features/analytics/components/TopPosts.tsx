const POSTS = [
  {
    text: "Quietly opening early access. ✦ One workspace, every channel.",
    channel: "LinkedIn",
    pfClass: "pf-li",
    reach: 28_400,
    engage: "12.8%",
    model: "Claude",
    cls: "claude",
  },
  {
    text: "Brand voices stitched into every draft. Try them in the Generator.",
    channel: "X / Twitter",
    pfClass: "pf-x",
    reach: 18_200,
    engage: "9.4%",
    model: "GPT",
    cls: "gpt",
  },
  {
    text: "Northpine cut planning time from 3 hours to 25 minutes per week.",
    channel: "LinkedIn",
    pfClass: "pf-li",
    reach: 16_900,
    engage: "11.1%",
    model: "Claude",
    cls: "claude",
  },
  {
    text: "How drafts arrive in OmniGrowth — a 30-second tour.",
    channel: "TikTok",
    pfClass: "pf-tt",
    reach: 14_300,
    engage: "14.2%",
    model: "Gemini",
    cls: "gemini",
  },
  {
    text: "Marketing teams: brief once, ship everywhere.",
    channel: "Instagram",
    pfClass: "pf-ig",
    reach: 11_800,
    engage: "8.0%",
    model: "GPT",
    cls: "gpt",
  },
];

export function TopPosts() {
  return (
    <section className="card-pad" aria-labelledby="top-posts-title">
      <div className="card-eyebrow">
        <span id="top-posts-title">
          <span className="num-tag">C</span>Top posts · last 30 days
        </span>
        <span>By engagement</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: "44%" }}>Post</th>
            <th>Channel</th>
            <th>Model</th>
            <th className="num">Reach</th>
            <th className="num">Engagement</th>
          </tr>
        </thead>
        <tbody>
          {POSTS.map((p, i) => (
            <tr key={i}>
              <td className="td-post">{p.text}</td>
              <td>
                <span className={`td-channel ${p.pfClass}`}>
                  <span className="pf-dot" />
                  {p.channel}
                </span>
              </td>
              <td>
                <span className={`llm-badge ${p.cls}`}>
                  <span className="llm-dot" />
                  {p.model}
                </span>
              </td>
              <td className="num tabular">{p.reach.toLocaleString()}</td>
              <td className="num">{p.engage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
