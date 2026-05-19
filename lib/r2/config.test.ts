import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getR2Config } from "./config";

const COMPLETE_ENV = {
  R2_ACCOUNT_ID: "acct123",
  R2_ACCESS_KEY_ID: "AKIA",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "omnigrowth-media-dev",
  R2_ENDPOINT: "https://acct123.r2.cloudflarestorage.com",
  NEXT_PUBLIC_APP_ENV: "dev",
} as const;

beforeEach(() => {
  for (const k of Object.keys(COMPLETE_ENV)) vi.stubEnv(k, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getR2Config", () => {
  it("returns the config when all envs are set", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    expect(getR2Config()).toEqual({
      env: "dev",
      bucket: "omnigrowth-media-dev",
      endpoint: "https://acct123.r2.cloudflarestorage.com",
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
      accountId: "acct123",
    });
  });

  it("throws a clear error listing missing envs", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("R2_BUCKET", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    expect(() => getR2Config()).toThrowError(
      /R2_BUCKET.*R2_SECRET_ACCESS_KEY|R2_SECRET_ACCESS_KEY.*R2_BUCKET/,
    );
  });

  it("defaults env to 'dev' when NEXT_PUBLIC_APP_ENV is missing", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "");
    expect(getR2Config().env).toBe("dev");
  });

  it("accepts 'prod' as a value", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "prod");
    expect(getR2Config().env).toBe("prod");
  });

  it("rejects an unknown NEXT_PUBLIC_APP_ENV", () => {
    for (const [k, v] of Object.entries(COMPLETE_ENV)) vi.stubEnv(k, v);
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
    expect(() => getR2Config()).toThrowError(/NEXT_PUBLIC_APP_ENV/);
  });
});
