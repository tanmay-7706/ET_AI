import { inngest } from "../client";
import {
  upsertEntityAndEdges,
  type GraphDataAccess,
  type Entity,
  type GraphEdge,
} from "@/lib/graph/traversal";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// ─── Convex-backed GraphDataAccess adapter ─────────────────────
// Wraps the Convex client to conform to the pure GraphDataAccess
// interface, keeping the traversal logic decoupled from Convex.

function createConvexGraphAccess(convexUrl: string): GraphDataAccess {
  const client = new ConvexHttpClient(convexUrl);

  return {
    async getEntity(entityId: string): Promise<Entity | null> {
      const result = await client.query(api.graph.getEntityById, { entityId });
      return result ?? null;
    },
    async getEdgesFrom(entityId: string): Promise<GraphEdge[]> {
      const edges = await client.query(api.graph.getEdgesFrom, { entityId });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Map Convex _id to edgeId
      return edges.map((e: any) => ({ ...e, edgeId: e._id }));
    },
    async getEdgesTo(entityId: string): Promise<GraphEdge[]> {
      const edges = await client.query(api.graph.getEdgesTo, { entityId });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Map Convex _id to edgeId
      return edges.map((e: any) => ({ ...e, edgeId: e._id }));
    },
    async upsertEntity(entity): Promise<Entity> {
      return await client.mutation(api.graph.upsertEntity, entity);
    },
    async createEdge(edge): Promise<GraphEdge> {
      return await client.mutation(api.graph.createEdge, edge);
    },
  };
}

/**
 * enrichEntityGraph
 *
 * Triggered when an entity mention is detected in a transcript or report.
 * Uses the pure upsertEntityAndEdges() function from /lib/graph/traversal.ts
 * with a Convex-backed data access adapter.
 */
export const enrichEntityGraph = inngest.createFunction(
  {
    id: "enrich-entity-graph",
    name: "Enrich Entity Graph",
  },
  { event: "entity/mention.detected" },
  async ({ event, step }) => {
    const { entityType, entityValue, sourceEventId, relatedEntityIds } =
      event.data;

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

    // Step 1: Upsert entity and create bidirectional edges via pure function
    const result = await step.run(
      "upsert-entity-and-edges",
      async () => {
        const dataAccess = createConvexGraphAccess(convexUrl);
        // Default to "co-occurred-in-call" — the event payload could
        // carry a relationshipType field in a future iteration.
        return await upsertEntityAndEdges(
          dataAccess,
          entityType,
          entityValue,
          sourceEventId,
          relatedEntityIds,
          "co-occurred-in-call"
        );
      }
    );

    // Step 2: Emit edge.created events for downstream convergence checks
    for (const edge of result.edges) {
      // Only emit for forward edges (avoid double-processing reverse edges)
      if (edge.fromEntityId === result.entity.entityId) {
        await step.run(`emit-edge-created-${edge.edgeId}`, async () => {
          await inngest.send({
            name: "graph/edge.created",
            data: {
              edgeId: edge.edgeId,
              fromEntityId: edge.fromEntityId,
              toEntityId: edge.toEntityId,
              relationshipType: edge.relationshipType,
              confidence: edge.confidence,
            },
          });
        });
      }
    }

    return {
      entityId: result.entity.entityId,
      edgesCreated: result.edges.length,
    };
  }
);
