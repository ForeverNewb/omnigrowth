// Cross-feature shared tables. Convex Auth's tables (authSessions,
// authAccounts, authVerificationCodes, authVerifiers) are spread from
// `authTables`; we override the default `users` table to add a `tier` field.
//
// Per the @convex-dev/auth docs (verified via Context7, 2026-05-04), there is
// no spread-friendly helper for the users override — every default field must
// be re-declared verbatim alongside any custom field.

import { authTables } from "@convex-dev/auth/server";
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sharedSchema = {
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    tier: v.union(v.literal("free"), v.literal("pro"), v.literal("agency")),
  }).index("email", ["email"]),
} as const;
