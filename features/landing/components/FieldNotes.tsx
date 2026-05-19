export function FieldNotes() {
  return (
    <section className="shell mt-48">
      <div className="section-head">
        <div className="section-num">04 /</div>
        <h2 className="section-title">From the field.</h2>
        <div className="section-aside">Notes from teams in the beta</div>
      </div>

      <div className="field-notes">
        <article className="field-feature">
          <div className="field-feature-mark">&ldquo;</div>
          <blockquote className="field-feature-quote">
            We replaced four tools and a shared spreadsheet with OmniGrowth. The first Monday after
            we switched, our designer asked where the meeting was. We didn&rsquo;t have one. The
            calendar was already done.
          </blockquote>
          <div className="field-feature-sig">
            <div className="field-sig-name">Maren Holst</div>
            <div className="field-sig-meta">Head of Marketing · Northpine Outfitters</div>
          </div>
          <div className="field-feature-foot">
            <span>Beta member since Aug &lsquo;25</span>
            <span>Team of 6</span>
            <span>8 channels</span>
          </div>
        </article>

        <div className="field-quotes">
          <article className="field-quote">
            <blockquote>
              I stopped writing first drafts. I write briefs now and edit. That&rsquo;s the whole
              job change.
            </blockquote>
            <div className="field-quote-sig">
              <strong>Devon Kowalski</strong>
              <span>Content Lead · BlueRiver Studio</span>
            </div>
          </article>
          <article className="field-quote">
            <blockquote>
              Three hours a week back. I gave one of them to my dog and the other two to actually
              thinking.
            </blockquote>
            <div className="field-quote-sig">
              <strong>Priya Ramanathan</strong>
              <span>Founder · Foxglove &amp; Co</span>
            </div>
          </article>
          <article className="field-quote">
            <blockquote>
              The model badges sound silly until you realize you&rsquo;ve been arguing with one LLM
              for a week. Pick the one that fits the brief.
            </blockquote>
            <div className="field-quote-sig">
              <strong>Sam Atieno</strong>
              <span>Director · Atlas &amp; Co Agency</span>
            </div>
          </article>
        </div>
      </div>

      <div className="field-press">
        <div className="field-press-cell">
          <span className="field-press-num">#1</span>
          <span className="field-press-label">Product Hunt · Marketing</span>
          <span className="field-press-date">Jan &lsquo;26</span>
        </div>
        <div className="field-press-cell">
          <span className="field-press-num">A−</span>
          <span className="field-press-label">
            Reviewed in <em>The Marketing Stack Weekly</em>
          </span>
          <span className="field-press-date">Mar &lsquo;26</span>
        </div>
        <div className="field-press-cell">
          <span className="field-press-num">
            98<sub>NPS</sub>
          </span>
          <span className="field-press-label">Beta cohort survey</span>
          <span className="field-press-date">142 respondents</span>
        </div>
        <div className="field-press-cell">
          <span className="field-press-num">
            SOC<sub>2</sub>
          </span>
          <span className="field-press-label">Type I attestation</span>
          <span className="field-press-date">Q4 &lsquo;25</span>
        </div>
      </div>
    </section>
  );
}
