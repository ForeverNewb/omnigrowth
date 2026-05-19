import Link from "next/link";

// Stub for the dedicated AI post generator. Real UI ships once the design
// brief from the Claude Design session lands. The dashboard's Quick AI
// panel routes here; until then it shows a placeholder so the link isn't
// dead.
export default async function GeneratePage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;

  return (
    <>
      <div className="app-page-head">
        <div>
          <h1>AI Post Generator</h1>
        </div>
      </div>

      <section className="card-pad mt-24" style={{ textAlign: "center", padding: 64 }}>
        <div className="card-eyebrow" style={{ justifyContent: "center" }}>
          <span>Coming soon</span>
        </div>
        <h2 style={{ marginTop: 16 }}>The full generator is being designed</h2>
        <p className="caption" style={{ maxWidth: 520, margin: "12px auto 0" }}>
          Brief once. Pick text / image / video. The agent picks the best AI for the job. Preview
          and history land soon. For now use the Quick generator on the dashboard.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link href={`/dash/b/${brandId}/dashboard`} className="btn btn-primary btn-arrow">
            Back to dashboard
          </Link>
        </div>
      </section>
    </>
  );
}
