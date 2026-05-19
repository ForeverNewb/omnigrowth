// Composes per-feature schema fragments. See docs/architecture.md.
// Each feature owns its own tables under features/<name>/schema.ts.

import { analyticsSchema } from "@/features/analytics/schema";
import { brandProfileSchema } from "@/features/brand-profile/schema";
import { calendarSchema } from "@/features/calendar/schema";
import { dashboardSchema } from "@/features/dashboard/schema";
import { landingSchema } from "@/features/landing/schema";
import { mediaLibrarySchema } from "@/features/media-library/schema";
import { postGeneratorSchema } from "@/features/post-generator/schema";
import { defineSchema } from "convex/server";
import { sharedSchema } from "./shared/schema";

export default defineSchema({
  ...sharedSchema,
  ...landingSchema,
  ...brandProfileSchema,
  ...dashboardSchema,
  ...mediaLibrarySchema,
  ...postGeneratorSchema,
  ...calendarSchema,
  ...analyticsSchema,
});
