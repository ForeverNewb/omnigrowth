import type { Id } from "@/convex/_generated/dataModel";
import { GeneratorWorkspace } from "@/features/post-generator/components/GeneratorWorkspace";

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;

  return (
    <>
      <div className="gen-page-head">
        <div>
          <h1>
            Brief once. <em>Drafts that read like you.</em>
          </h1>
          <p className="body-lg mt-8">
            Tell the AI what you want to post. Pick a channel and tone. Preview, regenerate, or send
            to the calendar.
          </p>
        </div>
      </div>

      <GeneratorWorkspace brandId={brandId as Id<"brand_profiles">} />
    </>
  );
}
