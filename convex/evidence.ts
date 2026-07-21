import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries for Evidence Packaging ──────────────────────────────

/**
 * Get a scam session by its sessionId.
 */
export const getSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db
      .query("scamSessions")
      .filter((q) => q.eq(q.field("sessionId"), sessionId))
      .first();
    return session ?? null;
  },
});

/**
 * Get all entities related to a session.
 * This looks up entities that appeared in graph edges whose
 * sourceEventId matches the sessionId.
 */
export const getEntitiesForSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    // Find edges whose sourceEventId references this session
    const edges = await ctx.db.query("graphEdges").collect();
    const sessionEdges = edges.filter(
      (e) => e.sourceEventId === sessionId
    );

    // Collect unique entity IDs
    const entityIds = new Set<string>();
    for (const edge of sessionEdges) {
      entityIds.add(edge.fromEntityId);
      entityIds.add(edge.toEntityId);
    }

    // Fetch entity records
    const entities = [];
    for (const entityId of entityIds) {
      const entity = await ctx.db
        .query("entities")
        .withIndex("by_entityId", (q) => q.eq("entityId", entityId))
        .first();
      if (entity) {
        entities.push({
          entityId: entity.entityId,
          type: entity.type,
          value: entity.value,
          firstSeenAt: entity.firstSeenAt,
          riskWeight: entity.riskWeight,
        });
      }
    }

    return entities;
  },
});

/**
 * Get all edges connected to any of the given entity IDs.
 */
export const getEdgesForEntities = query({
  args: { entityIds: v.array(v.string()) },
  handler: async (ctx, { entityIds }) => {
    const allEdges = [];
    const seenEdgeKeys = new Set<string>();

    for (const entityId of entityIds) {
      const fromEdges = await ctx.db
        .query("graphEdges")
        .withIndex("by_fromEntityId", (q) => q.eq("fromEntityId", entityId))
        .collect();

      const toEdges = await ctx.db
        .query("graphEdges")
        .withIndex("by_toEntityId", (q) => q.eq("toEntityId", entityId))
        .collect();

      for (const edge of [...fromEdges, ...toEdges]) {
        const key = `${edge.fromEntityId}_${edge.toEntityId}_${edge.relationshipType}`;
        if (!seenEdgeKeys.has(key)) {
          seenEdgeKeys.add(key);
          allEdges.push({
            edgeId: `edge_${edge._id}`,
            fromEntityId: edge.fromEntityId,
            toEntityId: edge.toEntityId,
            relationshipType: edge.relationshipType,
            confidence: edge.confidence,
            sourceEventId: edge.sourceEventId,
            createdAt: edge.createdAt,
          });
        }
      }
    }

    return allEdges;
  },
});

/**
 * Find sessions that share entities with the given entity IDs.
 */
export const getRelatedSessions = query({
  args: { entityIds: v.array(v.string()) },
  handler: async (ctx, { entityIds }) => {
    const sessionIds = new Set<string>();

    for (const entityId of entityIds) {
      const edges = await ctx.db
        .query("graphEdges")
        .withIndex("by_fromEntityId", (q) => q.eq("fromEntityId", entityId))
        .collect();

      for (const edge of edges) {
        // sourceEventId might be a session ID
        sessionIds.add(edge.sourceEventId);
      }
    }

    const sessions = [];
    for (const sid of sessionIds) {
      const session = await ctx.db
        .query("scamSessions")
        .filter((q) => q.eq(q.field("sessionId"), sid))
        .first();
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  },
});

// ─── Mutation ────────────────────────────────────────────────────

/**
 * Write a draft evidence package to the evidencePackages table.
 */
export const writeEvidencePackage = mutation({
  args: {
    packageId: v.string(),
    relatedSessionIds: v.array(v.string()),
    relatedEntityIds: v.array(v.string()),
    timeline: v.array(
      v.object({
        timestamp: v.number(),
        event: v.string(),
        sourceCitation: v.string(),
      })
    ),
    confidenceScore: v.number(),
    status: v.union(v.literal("draft"), v.literal("finalized")),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("evidencePackages", {
      packageId: args.packageId,
      relatedSessionIds: args.relatedSessionIds,
      relatedEntityIds: args.relatedEntityIds,
      timeline: args.timeline,
      confidenceScore: args.confidenceScore,
      status: args.status,
      createdAt: args.createdAt,
    });
  },
});

// ─── Internal mutations for live demo pipeline ──────────────────

/**
 * Updates a scam session's risk score, status, reasoning, and appends
 * a new transcript chunk. Called by classifyTranscriptChunk Inngest function.
 */
export const updateSessionRiskScore = mutation({
  args: {
    sessionId: v.string(),
    riskScore: v.number(),
    status: v.union(
      v.literal("monitoring"),
      v.literal("flagged"),
      v.literal("confirmed"),
      v.literal("resolved")
    ),
    lastReasoning: v.optional(v.string()),
    newChunk: v.optional(
      v.object({
        text: v.string(),
        timestamp: v.number(),
        speaker: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("scamSessions")
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .first();

    if (!session) return null;

    const updatedChunks = args.newChunk
      ? [...session.transcriptChunks, args.newChunk]
      : session.transcriptChunks;

    await ctx.db.patch(session._id, {
      riskScore: args.riskScore,
      status: args.status,
      lastReasoning: args.lastReasoning,
      transcriptChunks: updatedChunks,
      updatedAt: Date.now(),
    });

    return { sessionId: args.sessionId, riskScore: args.riskScore, status: args.status };
  },
});

/**
 * Creates a fresh scam session for live demo playback.
 * Called by the playDemoScenario Inngest function.
 */
export const createDemoSession = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("scamSessions", {
      sessionId: args.sessionId,
      transcriptChunks: [],
      riskScore: 0,
      status: "monitoring",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Creates a complaint location for the threat map.
 * Called by the playDemoScenario Inngest function.
 */
export const createComplaintLocation = mutation({
  args: {
    locationId: v.string(),
    lat: v.number(),
    lng: v.number(),
    type: v.union(v.literal("digital-arrest"), v.literal("counterfeit-seizure")),
    severity: v.number(),
    reportedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("complaintLocations", {
      locationId: args.locationId,
      lat: args.lat,
      lng: args.lng,
      type: args.type,
      severity: args.severity,
      reportedAt: args.reportedAt,
    });
  },
});
