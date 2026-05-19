"use client";

// Renders the brand's media as a responsive thumbnail grid. Each tile
// fetches its own short-lived signed URL via presignRead. URLs are cached in
// component state and re-fetched if the user keeps the tab open beyond the
// 24h TTL (refresh-on-render is fine for v1; a dedicated "URL expired"
// detector lands when we actually hit the case).

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useEffect, useState } from "react";

type Props = { brandId: Id<"brand_profiles"> };

export function MediaGrid({ brandId }: Props) {
  const assets = useQuery(api.mediaLibrary.assets.list, { brandId });

  if (assets === undefined) {
    return <div className="caption">Loading media…</div>;
  }
  if (assets.length === 0) {
    return <div className="caption">No media yet. Upload one above.</div>;
  }

  return (
    <div className="grid-4 mt-16">
      {assets.map((asset) => (
        <MediaTile key={asset._id} asset={asset} />
      ))}
    </div>
  );
}

function MediaTile({ asset }: { asset: Doc<"media_assets"> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const presignRead = useAction(api.mediaLibrary.presign.presignRead);

  useEffect(() => {
    let cancelled = false;
    presignRead({ assetId: asset._id })
      .then(({ url }) => {
        if (!cancelled) setUrl(url);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [asset._id, presignRead]);

  return (
    <div className="card">
      {error !== null && <div className="caption">Error: {error}</div>}
      {error === null && url === null && <div className="caption">Loading…</div>}
      {error === null && url !== null && asset.kind === "image" && (
        <img src={url} alt={asset.originalFilename ?? "media"} className="w-full h-auto rounded" />
      )}
      {error === null && url !== null && asset.kind === "video" && (
        <video src={url} controls className="w-full h-auto rounded">
          <track kind="captions" />
        </video>
      )}
      <div className="caption mt-8">{asset.originalFilename ?? asset.key}</div>
    </div>
  );
}
