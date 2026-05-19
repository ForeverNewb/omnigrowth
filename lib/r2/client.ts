// S3 client wrapper for Cloudflare R2. Node-only — DO NOT import this from
// Convex queries or mutations (V8 runtime). Only Convex actions with
// `"use node";` and the future render worker / admin CLI may import this.
//
// AWS SDK v3 + R2 surface verified via Context7 on 2026-05-05:
// - region: "auto" (R2 ignores the value but the SDK requires one)
// - endpoint: <https://ACCOUNT_ID.r2.cloudflarestorage.com>
// - forcePathStyle: false (R2's S3 endpoint is virtual-hosted-style)

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { type R2Config, getR2Config } from "./config";

let cached: { client: S3Client; config: R2Config } | null = null;

function getClient(): { client: S3Client; config: R2Config } {
  if (cached !== null) return cached;
  const config = getR2Config();
  const client = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: false,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  cached = { client, config };
  return cached;
}

const PUT_TTL_SECONDS = 15 * 60; // 15 minutes
const GET_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export async function presignPut(args: {
  key: string;
  contentType: string;
}): Promise<string> {
  const { client, config } = getClient();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: args.key,
      ContentType: args.contentType,
    }),
    { expiresIn: PUT_TTL_SECONDS },
  );
}

export async function presignGet(args: { key: string }): Promise<string> {
  const { client, config } = getClient();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: args.key }), {
    expiresIn: GET_TTL_SECONDS,
  });
}

export async function deleteObject(args: { key: string }): Promise<void> {
  const { client, config } = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: args.key }));
}

export async function headObject(args: {
  key: string;
}): Promise<{ size: number; contentType: string | null } | null> {
  const { client, config } = getClient();
  try {
    const out = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: args.key }));
    return {
      size: out.ContentLength ?? 0,
      contentType: out.ContentType ?? null,
    };
  } catch (err) {
    // SDK throws NotFound for 404 — surface as null instead of bubbling so
    // callers don't conflate "object missing" with infrastructure failure.
    if ((err as { name?: string }).name === "NotFound") return null;
    throw err;
  }
}
