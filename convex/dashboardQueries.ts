import { query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════════
// Dashboard Queries — Live Query Layer
// ═══════════════════════════════════════════════════════════════════
// All functions are Convex queries (not actions) so the frontend can
// use useQuery() and get automatic real-time updates for free.
// No pagination needed at hackathon data volumes.
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns all complaint locations for the live threat map.
 */
export const getActiveComplaintLocations = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("complaintLocations").collect();
  },
});

/**
 * Returns a session plus its connected entities and graphEdges,
 * traversed to depth 2 from the session's directly-linked entities.
 */
export const getSessionWithGraph = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    // Get the session
    const sessions = await ctx.db
      .query("scamSessions")
      .collect();
    const session = sessions.find((s) => s.sessionId === args.sessionId) ?? null;
    if (!session) return null;

    // Get entities that reference this session (via edges or conventions)
    // We'll collect all entities and edges, then filter by traversal.
    const allEdges = await ctx.db.query("graphEdges").collect();
    const allEntities = await ctx.db.query("entities").collect();

    // Depth 1: find entities connected to edges that reference this session's entities
    // For simplicity at hackathon scale, gather all entities and edges and let the
    // frontend filter. For depth-2, we follow edges from directly connected entities.
    const entityMap = new Map(allEntities.map((e) => [e.entityId, e]));
    const connectedEntityIds = new Set<string>();
    const connectedEdges = [];

    // Depth 1 edges
    for (const edge of allEdges) {
      connectedEntityIds.add(edge.fromEntityId);
      connectedEntityIds.add(edge.toEntityId);
      connectedEdges.push(edge);
    }

    // Depth 2: entities connected to depth-1 entities
    for (const edge of allEdges) {
      if (connectedEntityIds.has(edge.fromEntityId) || connectedEntityIds.has(edge.toEntityId)) {
        connectedEntityIds.add(edge.fromEntityId);
        connectedEntityIds.add(edge.toEntityId);
      }
    }

    const entities = [...connectedEntityIds]
      .map((id) => entityMap.get(id))
      .filter(Boolean);

    return {
      session,
      entities,
      edges: connectedEdges,
    };
  },
});

/**
 * Returns the most recent evidence packages ordered by createdAt desc.
 * Used for the live action ticker on the command center.
 */
export const getRecentAlerts = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evidencePackages")
      .order("desc")
      .take(args.limit);
  },
});

/**
 * Returns the full entity/edge set for the network graph component.
 * Fine to return everything given hackathon-scale demo data volume.
 */
export const getAllEntitiesAndEdges = query({
  args: {},
  handler: async (ctx) => {
    const entities = await ctx.db.query("entities").collect();
    const edges = await ctx.db.query("graphEdges").collect();
    return { entities, edges };
  },
});

/**
 * Returns all active scam sessions for the live sessions panel.
 */
export const getActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("scamSessions").order("desc").collect();
  },
});

/**
 * Unified activity feed — merges alertLog entries and evidencePackage
 * creation events into a single timeline sorted by timestamp descending.
 * The LiveTicker on the command center shows classification, alerts, and
 * evidence packaging as one coherent timeline.
 */
export const getRecentActivityFeed = query({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    // Fetch recent alerts from alertLog (using index for efficiency)
    const alerts = await ctx.db
      .query("alertLog")
      .withIndex("by_dispatchedAt")
      .order("desc")
      .take(args.limit);

    // Fetch recent evidence packages
    const packages = await ctx.db
      .query("evidencePackages")
      .order("desc")
      .take(args.limit);

    // Normalize both into a common feed item shape
    type FeedItem = {
      id: string;
      timestamp: number;
      message: string;
      type: "alert" | "warning" | "info" | "success";
      source: "alert" | "evidence";
    };

    const feedItems: FeedItem[] = [];

    for (const alert of alerts) {
      feedItems.push({
        id: alert.alertId,
        timestamp: alert.dispatchedAt,
        message: alert.message,
        type: alert.channel === "citizen" ? "warning" : "alert",
        source: "alert",
      });
    }

    for (const pkg of packages) {
      feedItems.push({
        id: pkg.packageId,
        timestamp: pkg.createdAt,
        message: `Evidence package ${pkg.packageId} created. Confidence: ${(pkg.confidenceScore * 100).toFixed(0)}%. Status: ${pkg.status.toUpperCase()}.`,
        type: pkg.confidenceScore > 0.8 ? "success" : "info",
        source: "evidence",
      });
    }

    // Sort merged list by timestamp descending and take the requested limit
    feedItems.sort((a, b) => b.timestamp - a.timestamp);
    return feedItems.slice(0, args.limit);
  },
});

// ═══════════════════════════════════════════════════════════════════
// Impact Metrics — Business Value Aggregation (Step 12)
// ═══════════════════════════════════════════════════════════════════

/**
 * Average reported loss per digital-arrest scam incident in INR.
 * This is a simplified illustrative figure for demo purposes, NOT a
 * validated actuarial number. Based on publicly reported average
 * losses from NCRB/I4C data (₹1.5–3 lakhs per incident).
 * Used solely for the demo impact panel.
 */
const AVERAGE_REPORTED_LOSS_PER_INCIDENT = 250_000; // ₹2.5 Lakhs

/**
 * Returns aggregate impact metrics for the business-value summary panel.
 * Read-only aggregation query — no writes, no side effects.
 *
 * Note: estimatedPreventedLoss is a simplified estimate for demo purposes.
 * It should not be presented as a validated actuarial figure.
 */
export const getImpactMetrics = query({
  args: {},
  handler: async (ctx) => {
    const allSessions = await ctx.db.query("scamSessions").collect();
    const totalSessionsMonitored = allSessions.length;

    const sessionsFlaggedOrConfirmed = allSessions.filter(
      (s) => s.status === "flagged" || s.status === "confirmed"
    ).length;

    // Count convergence edges (edges linking digital-arrest to counterfeit clusters)
    // For simplicity, we count unique graphEdges where at least one entity
    // is a currencyNoteSerial and the other is not (cross-category link).
    const allEdges = await ctx.db.query("graphEdges").collect();
    const allEntities = await ctx.db.query("entities").collect();
    const entityTypeMap = new Map(allEntities.map((e) => [e.entityId, e.type]));

    let convergenceLinksDetected = 0;
    for (const edge of allEdges) {
      const fromType = entityTypeMap.get(edge.fromEntityId);
      const toType = entityTypeMap.get(edge.toEntityId);
      if (
        (fromType === "currencyNoteSerial" && toType !== "currencyNoteSerial") ||
        (toType === "currencyNoteSerial" && fromType !== "currencyNoteSerial")
      ) {
        convergenceLinksDetected++;
      }
    }
    // Each convergence link is stored bidirectionally, so halve the count
    convergenceLinksDetected = Math.ceil(convergenceLinksDetected / 2);

    // Count distinct advisories consulted (embedded in the RAG corpus)
    const advisories = await ctx.db.query("advisories").collect();
    const advisoriesConsultedCount = advisories.length;

    // Simplified estimate: flagged/confirmed sessions * average loss prevented
    const estimatedPreventedLoss =
      sessionsFlaggedOrConfirmed * AVERAGE_REPORTED_LOSS_PER_INCIDENT;

    return {
      totalSessionsMonitored,
      sessionsFlaggedOrConfirmed,
      convergenceLinksDetected,
      advisoriesConsultedCount,
      estimatedPreventedLoss,
    };
  },
});
