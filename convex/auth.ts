// Convex Auth boot. Two providers:
//   - Password (kept primarily for /dev-login E2E + multi-account dev testing)
//   - ResendOTP (8-digit email code; the production sign-in path)
//
// User creation is centralised in `callbacks.createOrUpdateUser` so both
// providers produce a `users` row with `tier: "free"`. Name is captured at
// signUp time:
//   - Password: name flows through the provider's `profile()` callback.
//   - ResendOTP: name is set after verification via `users.setName` mutation
//     called from the client (Email provider's verification callback only
//     receives `email`).
//
// `buildNewUserDoc` is the shared input-narrowing helper, exported for tests.

import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";
import type { DataModel } from "./_generated/dataModel";

interface NewUserDoc {
  email: string;
  name?: string;
  tier: "free";
}

export function buildNewUserDoc(profile: Record<string, unknown>): NewUserDoc {
  const email = typeof profile.email === "string" ? profile.email : "";
  const name =
    typeof profile.name === "string" && profile.name.trim().length > 0
      ? profile.name.trim()
      : undefined;
  return {
    email,
    ...(name !== undefined ? { name } : {}),
    tier: "free" as const,
  };
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        return buildNewUserDoc(params);
      },
    }),
    ResendOTP,
  ],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId !== null) return existingUserId;
      return await ctx.db.insert("users", buildNewUserDoc(profile));
    },
  },
});
