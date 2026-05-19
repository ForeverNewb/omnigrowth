// Reads R2 envs and exposes them as a typed object. Throws clearly if any
// required env is missing — the alternative (a confusing AccessDenied at S3
// PUT time) is much worse.

import type { AssetEnv } from "./keys";

export type R2Config = {
  env: AssetEnv;
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
};

const REQUIRED_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_ENDPOINT",
] as const;

export function getR2Config(): R2Config {
  const missing = REQUIRED_KEYS.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `R2 config is missing the following env vars: ${missing.join(", ")}. See docs/superpowers/plans/2026-05-05-r2-media-library-foundation.md Pre-flight step 1.`,
    );
  }
  const rawEnv = process.env.NEXT_PUBLIC_APP_ENV || "dev";
  if (rawEnv !== "dev" && rawEnv !== "prod") {
    throw new Error(`NEXT_PUBLIC_APP_ENV must be "dev" or "prod"; got "${rawEnv}".`);
  }
  return {
    env: rawEnv,
    bucket: process.env.R2_BUCKET as string,
    endpoint: process.env.R2_ENDPOINT as string,
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    accountId: process.env.R2_ACCOUNT_ID as string,
  };
}
