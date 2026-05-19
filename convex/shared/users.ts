// Cross-feature user queries. Per docs/architecture.md, anything that's not
// owned by a single feature (auth, users) lives under convex/shared/.
//
// Addressable as `api.shared.users.viewer` from the Next.js side.

import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

// Sets the viewer's display name. Called from the OTP signUp flow after
// verification, since the OTP provider's createOrUpdateUser callback only
// receives `email` — name has nowhere else to land. Idempotent: callable from
// future profile-edit screens too.
export const setName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new ConvexError({ code: "INVALID_NAME" });
    }
    await ctx.db.patch(userId, { name: trimmed });
  },
});

// Internal so it cannot be called directly from the client. Used by:
//   - the future Stripe webhook in features/settings-billing/
//   - dev-time `npx convex run shared:users:updateTier` invocations to flip
//     your own tier in dev without going through billing.
export const updateTier = internalMutation({
  args: {
    userId: v.id("users"),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("agency")),
  },
  handler: async (ctx, { userId, tier }) => {
    const user = await ctx.db.get(userId);
    if (user === null) {
      throw new ConvexError({ code: "NOT_FOUND", entity: "user" });
    }
    await ctx.db.patch(userId, { tier });
  },
});
