type Cell = "yes" | "no" | "partial";

const ROWS: Array<[string, Cell, Cell, Cell, Cell]> = [
  ["Multi-LLM drafts (Claude / GPT / Gemini side-by-side)", "yes", "no", "partial", "no"],
  ["Unified calendar across 8 channels", "yes", "yes", "no", "partial"],
  ["AI image / video / carousel generation", "yes", "no", "partial", "no"],
  ["Drag-and-drop drafts onto the day", "yes", "partial", "no", "no"],
  ["AI insights (best time, what to repeat)", "yes", "partial", "no", "no"],
  ["Pay-as-you-use tokens (OmniBits)", "yes", "no", "partial", "no"],
  ["Approvals & brand voices", "yes", "partial", "no", "no"],
];

const SYMBOL: Record<Cell, string> = { yes: "✓", no: "·", partial: "~" };

export function Compare() {
  return (
    <section id="compare" className="shell mt-48">
      <div className="section-head">
        <div className="section-num">05 /</div>
        <h2 className="section-title">How OmniGrowth is different.</h2>
        <div className="section-aside">Versus the usual stack</div>
      </div>
      <div className="compare-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>
                <span className="row-eyebrow">Capability</span>What you get
              </th>
              <th className="us">
                <span className="row-eyebrow">This product</span>OmniGrowth
              </th>
              <th>
                <span className="row-eyebrow">Generic</span>Scheduler tool
              </th>
              <th>
                <span className="row-eyebrow">Generic</span>AI writer
              </th>
              <th>
                <span className="row-eyebrow">Generic</span>Spreadsheet + tabs
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([label, us, sched, ai, sheet]) => (
              <tr key={label}>
                <td>
                  <span className="feat-label">{label}</span>
                </td>
                <td className="us">
                  <span className={`check ${us}`}>{SYMBOL[us]}</span>
                </td>
                <td>
                  <span className={`check ${sched}`}>{SYMBOL[sched]}</span>
                </td>
                <td>
                  <span className={`check ${ai}`}>{SYMBOL[ai]}</span>
                </td>
                <td>
                  <span className={`check ${sheet}`}>{SYMBOL[sheet]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
