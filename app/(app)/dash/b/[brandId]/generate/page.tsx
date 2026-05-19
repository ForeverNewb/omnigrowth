import type { Id } from "@/convex/_generated/dataModel";
import { GeneratorForm } from "@/features/post-generator/components/GeneratorForm";

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
          <p className="caption">Text drafts. One channel at a time. Image and video land next.</p>
        </div>
      </div>

      <section className="mt-24" style={{ maxWidth: 720 }}>
        <GeneratorForm brandId={brandId as Id<"brand_profiles">} />
      </section>
    </>
  );
}
