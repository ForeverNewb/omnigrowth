// Scheduled functions registry. Convex picks this up automatically by name —
// the file MUST be named `convex/crons.ts` (or .js). See
// docs.convex.dev/scheduling/cron-jobs.

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily at 03:00 UTC. Picks a low-traffic window; tweak if user-region
// concentration shifts.
crons.cron(
  "media-library: purge expired R2 assets",
  "0 3 * * *",
  internal.mediaLibrary.cleanup.purgeExpired,
);

export default crons;
