import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ─────────────────────────────────────────────────────

/**
 * Look up an entity by its entityId.
 */
export const getEntityById = query({
  args: { entityId: v.string() },
  handler: async (ctx, { entityId }) => {
    const entity = await ctx.db
      .query("entities")
      .withIndex("by_entityId", (q) => q.eq("entityId", entityId))
      .first();
    return entity ?? null;
  },
});

/**
 * Get all edges originating from a given entity.
 */
export const getEdgesFrom = query({
  args: { entityId: v.string() },
  handler: async (ctx, { entityId }) => {
    return await ctx.db
      .query("graphEdges")
      .withIndex("by_fromEntityId", (q) => q.eq("fromEntityId", entityId))
      .collect();
  },
});

/**
 * Get all edges pointing to a given entity.
 */
export const getEdgesTo = query({
  args: { entityId: v.string() },
  handler: async (ctx, { entityId }) => {
    return await ctx.db
      .query("graphEdges")
      .withIndex("by_toEntityId", (q) => q.eq("toEntityId", entityId))
      .collect();
  },
});

// ─── Mutations ───────────────────────────────────────────────────

/**
 * Upsert an entity — if one with the same (type, value) exists,
 * update its riskWeight; otherwise insert a new record.
 */
export const upsertEntity = mutation({
  args: {
    entityId: v.optional(v.string()),
    type: v.union(
      v.literal("phone"),
      v.literal("upiId"),
      v.literal("deviceFingerprint"),
      v.literal("bankAccount"),
      v.literal("currencyNoteSerial"),
      v.literal("person")
    ),
    value: v.string(),
    firstSeenAt: v.number(),
    riskWeight: v.number(),
    clusterType: v.optional(
      v.union(v.literal("digital-arrest"), v.literal("counterfeit-seizure"))
    ),
  },
  handler: async (ctx, args) => {
    // Check if entity already exists
    const existing = await ctx.db
      .query("entities")
      .withIndex("by_type_value", (q) =>
        q.eq("type", args.type).eq("value", args.value)
      )
      .first();

    if (existing) {
      // Update risk weight
      await ctx.db.patch(existing._id, {
        riskWeight: Math.max(existing.riskWeight, args.riskWeight),
      });
      return {
        entityId: existing.entityId,
        type: existing.type,
        value: existing.value,
        firstSeenAt: existing.firstSeenAt,
        riskWeight: Math.max(existing.riskWeight, args.riskWeight),
      };
    }

    // Create new entity
    const entityId =
      args.entityId ?? `entity_${args.type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await ctx.db.insert("entities", {
      entityId,
      type: args.type,
      value: args.value,
      firstSeenAt: args.firstSeenAt,
      riskWeight: args.riskWeight,
    });

    return {
      entityId,
      type: args.type,
      value: args.value,
      firstSeenAt: args.firstSeenAt,
      riskWeight: args.riskWeight,
    };
  },
});

/**
 * Create a new graph edge.
 */
export const createEdge = mutation({
  args: {
    edgeId: v.optional(v.string()),
    fromEntityId: v.string(),
    toEntityId: v.string(),
    relationshipType: v.string(),
    confidence: v.number(),
    sourceEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const edgeId =
      args.edgeId ?? `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();

    await ctx.db.insert("graphEdges", {
      fromEntityId: args.fromEntityId,
      toEntityId: args.toEntityId,
      relationshipType: args.relationshipType,
      confidence: args.confidence,
      sourceEventId: args.sourceEventId,
      createdAt,
    });

    return {
      edgeId,
      fromEntityId: args.fromEntityId,
      toEntityId: args.toEntityId,
      relationshipType: args.relationshipType,
      confidence: args.confidence,
      sourceEventId: args.sourceEventId,
      createdAt,
    };
  },
});
