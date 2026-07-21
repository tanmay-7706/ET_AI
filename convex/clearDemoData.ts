import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

/**
 * Shared helper that clears all demo-relevant tables.
 * Used by both seed.ts (static seeding) and playDemoScenario (live playback)
 * to ensure idempotent reset before populating data.
 *
 * Tables cleared: scamSessions, entities, graphEdges, evidencePackages,
 * complaintLocations, alertLog.
 */
export async function clearAllDemoTables(ctx: MutationCtx): Promise<void> {
  const tables = [
    "scamSessions",
    "entities",
    "graphEdges",
    "evidencePackages",
    "complaintLocations",
    "alertLog",
  ] as const;

  for (const table of tables) {
    // Process in batches to stay within transaction limits
    let batch = await ctx.db.query(table).take(500);
    while (batch.length > 0) {
      for (const record of batch) {
        await ctx.db.delete(record._id);
      }
      batch = await ctx.db.query(table).take(500);
    }
  }
}

/**
 * Exposed as an internal mutation so it can be called from Inngest functions
 * via ConvexHttpClient. Clears all demo tables for a fresh scenario.
 */
export const resetDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    await clearAllDemoTables(ctx);
    return "Demo tables cleared.";
  },
});
