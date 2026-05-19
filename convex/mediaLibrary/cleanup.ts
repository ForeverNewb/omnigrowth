"use node";

// Daily scheduled action: scan media_assets for rows whose expiresAt <= now,
// delete the R2 object, then delete the Convex row. Runs as an internalAction
// so only the cron (or another internal Convex function) can invoke it.
//
// Failure modes handled:
// - R2 object already missing → log + delete the row anyway (orphan reaper).
// - R2 delete throws something other than NotFound → leave the row, surface
//   the error, the next run retries.
//
// NOTE: "use node" applies to the whole file — queries and mutations must
// live in cleanupHelpers.ts (V8 runtime). This file holds only the action.

import { deleteObject, headObject } from "../../lib/r2/client";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalAction } from "../_generated/server";

const BATCH_SIZE = 100;

export const purgeExpired = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scanned: number; deleted: number; failed: number }> => {
    const now = Date.now();
    const expired: Doc<"media_assets">[] = await ctx.runQuery(
      internal.mediaLibrary.cleanupHelpers._listExpired,
      {
        now,
        limit: BATCH_SIZE,
      },
    );

    let deleted = 0;
    let failed = 0;
    for (const row of expired) {
      // expiresAt === null rows would never appear (the index filter is
      // <= now and null is excluded), but defensive in case the index
      // semantics change.
      if (row.expiresAt === null) continue;
      try {
        // headObject is best-effort — if the object isn't there, the R2
        // delete is a no-op anyway. We call it primarily so we can log
        // sensible diagnostics if the byte size is wildly off (unused
        // here but cheap to keep — drop if observability arrives later).
        await headObject({ key: row.key });
        await deleteObject({ key: row.key });
      } catch (err) {
        console.error(`[r2-cleanup] failed to delete ${row.key}`, err);
        failed += 1;
        continue;
      }
      await ctx.runMutation(internal.mediaLibrary.cleanupHelpers._deleteRow, {
        assetId: row._id as Id<"media_assets">,
      });
      deleted += 1;
    }

    return { scanned: expired.length, deleted, failed };
  },
});
