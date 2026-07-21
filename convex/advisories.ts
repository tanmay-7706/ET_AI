import { internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Internal mutation to insert a single advisory chunk with its embedding.
 * Called by the seed script and by any future ingestion pipeline.
 */
export const insertAdvisoryChunk = internalMutation({
  args: {
    advisoryId: v.string(),
    sourceTitle: v.string(),
    sourceType: v.union(
      v.literal("NCRB"),
      v.literal("RBI"),
      v.literal("MHA")
    ),
    chunkText: v.string(),
    embedding: v.array(v.float64()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("advisories", {
      advisoryId: args.advisoryId,
      sourceTitle: args.sourceTitle,
      sourceType: args.sourceType,
      chunkText: args.chunkText,
      embedding: args.embedding,
      createdAt: args.createdAt,
    });
  },
});

/**
 * Search advisories using Convex vector search.
 * Returns the top K advisory chunks most semantically similar to the query embedding.
 *
 * This is the function other agents call for RAG grounding.
 *
 * Manual test: call with a sample embedding of "suspicious call claiming to be from customs"
 * and verify the top result relates to digital arrest / impersonation advisories.
 */
export const searchAdvisories = action({
  args: {
    queryEmbedding: v.array(v.float64()),
    topK: v.number(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.vectorSearch("advisories", "by_embedding", {
      vector: args.queryEmbedding,
      limit: args.topK,
    });

    // Fetch full documents for each result
    const advisories = [];
    for (const result of results) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cross-module query return type
      const doc: any = await ctx.runQuery(internal.advisoriesHelpers.getAdvisoryById, {
        id: result._id,
      });
      if (doc) {
        advisories.push({
          advisoryId: doc.advisoryId,
          sourceTitle: doc.sourceTitle,
          sourceType: doc.sourceType,
          chunkText: doc.chunkText,
          score: result._score,
        });
      }
    }

    return advisories;
  },
});

/**
 * Internal mutation to delete a single advisory by Convex _id.
 */
export const deleteAdvisory = internalMutation({
  args: { id: v.id("advisories") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
