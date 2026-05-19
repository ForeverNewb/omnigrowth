import type { Id } from "@/convex/_generated/dataModel";
import { MediaGrid } from "@/features/media-library/components/MediaGrid";
import { MediaUploader } from "@/features/media-library/components/MediaUploader";

export default async function MediaPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const id = brandId as Id<"brand_profiles">;
  return (
    <>
      <div className="app-page-head">
        <h1>Media</h1>
        <span className="caption">Uploads, AI-generated outputs, and renders.</span>
      </div>
      <div className="mt-24">
        <MediaUploader brandId={id} />
      </div>
      <MediaGrid brandId={id} />
    </>
  );
}
