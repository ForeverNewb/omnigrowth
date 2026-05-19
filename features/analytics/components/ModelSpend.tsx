const MODELS = [
  { name: "Claude", cls: "claude", bits: 1_840, share: 48 },
  { name: "GPT", cls: "gpt", bits: 1_120, share: 29 },
  { name: "Gemini", cls: "gemini", bits: 540, share: 14 },
  { name: "Llama", cls: "llama", bits: 220, share: 6 },
  { name: "Mistral", cls: "mistral", bits: 120, share: 3 },
];

export function ModelSpend() {
  const total = MODELS.reduce((sum, m) => sum + m.bits, 0);

  return (
    <section className="card-pad" aria-labelledby="spend-title">
      <div className="card-eyebrow">
        <span id="spend-title">
          <span className="num-tag">B</span>OmniBits consumed · by model
        </span>
        <span className="tabular">{total.toLocaleString()} ✦ this cycle</span>
      </div>
      <div className="model-spend">
        {MODELS.map((m) => (
          <div key={m.name} className="ms-row">
            <span className={`llm-badge ${m.cls}`}>
              <span className="llm-dot" />
              {m.name}
            </span>
            <div className="ms-bar">
              <span style={{ width: `${m.share}%` }} />
            </div>
            <span className="ms-cost tabular">{m.bits.toLocaleString()} ✦</span>
            <span className="ms-share">{m.share}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
