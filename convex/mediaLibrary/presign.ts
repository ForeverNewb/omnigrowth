"use node";

// Node-runtime actions that call into lib/r2/client.ts to mint signed URLs.
// The two flows:
//
// 1. Upload (browser → R2):
//    - Browser calls presignUpload({ brandId, originalFilename, contentType, sizeBytes }).
//    - Action validates ownership of brandId, validates contentType is in
//      the mime allowlist, builds a key via lib/r2/keys.ts, returns
//      { uploadUrl, key, contentType }.
//    - Browser PUTs the file to uploadUrl with the same Content-Type header.
//    - On 200, browser calls api.mediaLibrary.assets.recordUpload to insert
//      the metadata row.
//
// 2. Read (browser ← R2):
//    - Browser calls presignRead({ assetId }).
//    - Action verifies ownership via api.mediaLibrary.assets.get and returns
//      a 24h signed GET URL.
//
// Auth: getAuthUserId is available inside actions via the same import. The
// action validates ownership BEFORE producing the key / URL — never the other
// way around. The S3 layer has no auth context.

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { presignGet, presignPut } from "../../lib/r2/client";
import { type AssetEnv, buildKey, normaliseExt } from "../../lib/r2/keys";
import { isAllowedExt, mimeForExt } from "../../lib/r2/mime";
import { api } from "../_generated/api";
import { action } from "../_generated/server";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB hard cap for v1

function getEnv(): AssetEnv {
  const raw = process.env.NEXT_PUBLIC_APP_ENV ?? "dev";
  if (raw !== "dev" && raw !== "prod") {
    throw new ConvexError({ code: "INTERNAL", reason: "bad_env" });
  }
  return raw;
}

function makeNanoid(): string {
  // Convex's runtime has crypto.randomUUID. We strip dashes for a key-safe
  // string. Length = 32 chars, plenty of entropy. We avoid pulling in nanoid
  // to keep zero new transitive deps.
  return crypto.randomUUID().replace(/-/g, "");
}

export const presignUpload = action({
  args: {
    brandId: v.id("brand_profiles"),
    originalFilename: v.string(),
    contentType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }

    if (args.sizeBytes <= 0 || args.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new ConvexError({ code: "FILE_TOO_LARGE", limit: MAX_UPLOAD_BYTES });
    }

    // Validate the content type via the allowlist. The `contentType` the
    // browser declares is what we'll sign — and what S3 will require on the
    // PUT. We don't trust the file extension; we trust the mime.
    const extCheck = extFromMime(args.contentType);
    if (extCheck === null || mimeForExt(extCheck) === null) {
      throw new ConvexError({ code: "INVALID_CONTENT_TYPE" });
    }

    // Brand ownership — call the existing query. fetchQuery-style internal
    // calls inside an action use ctx.runQuery.
    const brand = await ctx.runQuery(api.brandProfile.brands.get, {
      brandId: args.brandId,
    });
    if (brand === null) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }

    // Pick the extension from the mime, not from the filename — defensive.
    const ext = extFromMime(args.contentType);
    if (ext === null || !isAllowedExt(ext)) {
      throw new ConvexError({ code: "INVALID_CONTENT_TYPE" });
    }

    const id = makeNanoid();
    const key = buildKey({
      env: getEnv(),
      scope: { kind: "brand", brandId: args.brandId },
      assetKind: "uploads",
      id,
      ext,
    });

    const uploadUrl = await presignPut({
      key,
      contentType: args.contentType,
    });

    return { uploadUrl, key, contentType: args.contentType };
  },
});

export const presignRead = action({
  args: { assetId: v.id("media_assets") },
  handler: async (ctx, { assetId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const asset = await ctx.runQuery(api.mediaLibrary.assets.get, { assetId });
    if (asset === null) {
      throw new ConvexError({ code: "NOT_FOUND" });
    }
    const url = await presignGet({ key: asset.key });
    return { url, expiresInSeconds: 24 * 60 * 60 };
  },
});

// Maps a content type back to the extension used in the R2 key. We
// intentionally don't trust the original filename's extension — the mime
// is what S3 sees on PUT. mp3-disguised-as-mp4 is out of scope for v1.
function extFromMime(contentType: string): string | null {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/quicktime":
      return "mov";
    case "video/webm":
      return "webm";
    default:
      return null;
  }
}
