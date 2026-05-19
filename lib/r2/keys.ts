// Pure helpers for building and parsing R2 object keys. Single source of truth
// for the `<env>/<scope>/<kind>/<id>.<ext>` shape. Every server-side write that
// produces a key must go through buildKey(). Hand-built key strings are a
// review-time bug.

export type AssetEnv = "dev" | "prod";

export type AssetScope = { kind: "global" } | { kind: "brand"; brandId: string };

export type AssetKind = "uploads" | "premade" | "ai-images" | "renders" | "brand-assets";

const ASSET_ENVS = ["dev", "prod"] as const;
const ASSET_KINDS = [
  "uploads",
  "premade",
  "ai-images",
  "renders",
  "brand-assets",
] as const satisfies readonly AssetKind[];

// id and ext sanity checks. These are not security boundaries — Convex schema
// types and the auth check at the call-site are. They are here so a malformed
// id or ext fails fast with a clear error rather than producing a key that
// only blows up at S3 PUT time.
const SAFE_TOKEN = /^[A-Za-z0-9_-]+$/;
const SAFE_EXT = /^[A-Za-z0-9]+$/;

export type BuildKeyArgs = {
  env: AssetEnv;
  scope: AssetScope;
  assetKind: AssetKind;
  id: string;
  ext: string;
};

export function buildKey(args: BuildKeyArgs): string {
  if (!SAFE_TOKEN.test(args.id)) {
    throw new Error(`invalid id: ${args.id}`);
  }
  const ext = normaliseExt(args.ext);
  if (ext === null || !SAFE_EXT.test(ext)) {
    throw new Error(`invalid extension: ${args.ext}`);
  }
  const scopeSegment = args.scope.kind === "global" ? "global" : `brand-${args.scope.brandId}`;
  if (args.scope.kind === "brand" && !SAFE_TOKEN.test(args.scope.brandId)) {
    throw new Error(`invalid brandId: ${args.scope.brandId}`);
  }
  return `${args.env}/${scopeSegment}/${args.assetKind}/${args.id}.${ext}`;
}

export function parseKey(key: string): BuildKeyArgs | null {
  const parts = key.split("/");
  if (parts.length !== 4) return null;
  const [env, scopePart, assetKind, last] = parts;
  if (!ASSET_ENVS.includes(env as AssetEnv)) return null;
  if (!ASSET_KINDS.includes(assetKind as AssetKind)) return null;
  const dot = last.lastIndexOf(".");
  if (dot <= 0 || dot === last.length - 1) return null;
  const id = last.slice(0, dot);
  const ext = last.slice(dot + 1);
  if (!SAFE_TOKEN.test(id) || !SAFE_EXT.test(ext)) return null;

  let scope: AssetScope;
  if (scopePart === "global") {
    scope = { kind: "global" };
  } else if (scopePart.startsWith("brand-")) {
    const brandId = scopePart.slice("brand-".length);
    if (!SAFE_TOKEN.test(brandId)) return null;
    scope = { kind: "brand", brandId };
  } else {
    return null;
  }

  return {
    env: env as AssetEnv,
    scope,
    assetKind: assetKind as AssetKind,
    id,
    ext,
  };
}

export function normaliseExt(raw: string): string | null {
  const trimmed = raw.startsWith(".") ? raw.slice(1) : raw;
  if (trimmed.length === 0) return null;
  return trimmed.toLowerCase();
}
