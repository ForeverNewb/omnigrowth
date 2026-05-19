// Pure-helper tests for the user-document builder used by both the Password
// provider's profile() callback and the createOrUpdateUser callback in
// convex/auth.ts. The helper centralises the input-narrowing logic so both
// flows produce the same shape.

import { describe, expect, it } from "vitest";
import { buildNewUserDoc } from "./auth";

describe("buildNewUserDoc", () => {
  it("returns email + tier for a minimal email-only profile", () => {
    expect(buildNewUserDoc({ email: "alice@example.com" })).toEqual({
      email: "alice@example.com",
      tier: "free",
    });
  });

  it("captures a non-empty name", () => {
    expect(buildNewUserDoc({ email: "alice@example.com", name: "Alice" })).toEqual({
      email: "alice@example.com",
      name: "Alice",
      tier: "free",
    });
  });

  it("trims whitespace from the captured name", () => {
    expect(buildNewUserDoc({ email: "alice@example.com", name: "  Alice  " })).toEqual({
      email: "alice@example.com",
      name: "Alice",
      tier: "free",
    });
  });

  it("omits name when an empty string is provided", () => {
    expect(buildNewUserDoc({ email: "alice@example.com", name: "" })).toEqual({
      email: "alice@example.com",
      tier: "free",
    });
  });

  it("omits name when only whitespace is provided", () => {
    expect(buildNewUserDoc({ email: "alice@example.com", name: "   " })).toEqual({
      email: "alice@example.com",
      tier: "free",
    });
  });

  it("falls back to empty email when email is missing", () => {
    expect(buildNewUserDoc({})).toEqual({
      email: "",
      tier: "free",
    });
  });

  it("falls back to empty email when email is not a string", () => {
    expect(buildNewUserDoc({ email: 42 })).toEqual({
      email: "",
      tier: "free",
    });
  });

  it("omits name when name is not a string", () => {
    expect(buildNewUserDoc({ email: "alice@example.com", name: 42 })).toEqual({
      email: "alice@example.com",
      tier: "free",
    });
  });
});
