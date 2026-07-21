import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal helper query used by the searchAdvisories action.
 * Actions cannot access ctx.db directly, so we use this query
 * to fetch full advisory documents by their Convex _id.
 */
export const getAdvisoryById = internalQuery({
  args: { id: v.id("advisories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Returns all advisory Convex _ids for bulk deletion during reseeding.
 */
export const getAllAdvisoryIds = internalQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("advisories").collect();
    return docs.map((d) => d._id);
  },
});
