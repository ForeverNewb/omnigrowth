// Allowlist of extensions that can land in R2, plus mime helpers used by the
// upload / read paths. Anything not in this list is rejected at upload time.

import { normaliseExt } from "./keys";

export const ALLOWED_EXTENSIONS = [
  "mp4",
  "mov",
  "webm",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

const EXT_TO_MIME: Record<AllowedExtension, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export function isAllowedExt(raw: string): boolean {
  const ext = normaliseExt(raw);
  if (ext === null) return false;
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function mimeForExt(raw: string): string | null {
  const ext = normaliseExt(raw);
  if (ext === null) return null;
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) return null;
  return EXT_TO_MIME[ext as AllowedExtension];
}

export type MediaKind = "image" | "video";

export function inferKindFromMime(mime: string): MediaKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return null;
}
