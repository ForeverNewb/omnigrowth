"use client";

// Minimal uploader. Single file at a time; no drag-and-drop polish, no
// progress bar yet — both land in the design follow-up. The point is to
// prove the pipe: file picker → presignUpload → PUT → recordUpload.

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";

type Props = { brandId: Id<"brand_profiles"> };

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; filename: string }
  | { kind: "error"; message: string }
  | { kind: "success"; filename: string };

const ALLOWED_MIMES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export function MediaUploader({ brandId }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const presignUpload = useAction(api.mediaLibrary.presign.presignUpload);
  const recordUpload = useMutation(api.mediaLibrary.assets.recordUpload);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!(ALLOWED_MIMES as readonly string[]).includes(file.type)) {
      setStatus({ kind: "error", message: `Unsupported file type: ${file.type || "unknown"}` });
      return;
    }

    setStatus({ kind: "uploading", filename: file.name });
    try {
      const { uploadUrl, key, contentType } = await presignUpload({
        brandId,
        originalFilename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`R2 PUT failed: ${putRes.status} ${putRes.statusText}`);
      }

      await recordUpload({
        brandId,
        key,
        contentType,
        sizeBytes: file.size,
        originalFilename: file.name,
      });

      setStatus({ kind: "success", filename: file.name });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    } finally {
      // Allow re-uploading the same file (input keeps last selection).
      e.target.value = "";
    }
  }

  return (
    <div className="card">
      <label className="btn">
        <input type="file" accept={ALLOWED_MIMES.join(",")} onChange={onFile} className="hidden" />
        Upload media
      </label>
      <div className="caption mt-8">
        {status.kind === "idle" && "Pick an image or video."}
        {status.kind === "uploading" && `Uploading ${status.filename}…`}
        {status.kind === "success" && `Uploaded ${status.filename}.`}
        {status.kind === "error" && `Error: ${status.message}`}
      </div>
    </div>
  );
}
