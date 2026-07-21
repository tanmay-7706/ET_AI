import { inngest } from "../client";
import {
  detectConvergence,
  type GraphDataAccess,
  type Entity,
  type GraphEdge,
} from "@/lib/graph/traversal";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// ─── Convex-backed GraphDataAccess adapter ─────────────────────

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
 * checkConvergence
 *
 * Triggered whenever a new graph edge is created. Uses the pure
 * detectConvergence() BFS function from /lib/graph/traversal.ts
 * to check whether a digital-arrest cluster and a counterfeit-seizure
 * cluster are now connected.
 */
export const checkConvergence = inngest.createFunction(
  {
    id: "check-convergence",
    name: "Check Graph Convergence",
  },
  { event: "graph/edge.created" },
  async ({ event, step }) => {
    const { fromEntityId, toEntityId } = event.data;

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

    // Step 1: Run convergence detection via pure BFS traversal
    const convergenceResult = await step.run(
      "detect-convergence",
      async () => {
        const dataAccess = createConvexGraphAccess(convexUrl);
        return await detectConvergence(dataAccess, fromEntityId, toEntityId);
      }
    );

    // Step 2: If convergence detected, emit convergence event
    if (convergenceResult.converged && convergenceResult.bridgeEntityId) {
      await step.run("emit-convergence-detected", async () => {
        await inngest.send({
          name: "graph/convergence.detected",
          data: {
            convergenceId: `conv_${Date.now()}`,
            bridgeEntityId: convergenceResult.bridgeEntityId!,
            clusterAType: convergenceResult.clusterAType!,
            clusterBType: convergenceResult.clusterBType!,
            confidenceScore: convergenceResult.confidenceScore,
            pathLength: convergenceResult.pathLength,
          },
        });
      });
    }

    return {
      checked: true,
      fromEntityId,
      toEntityId,
      converged: convergenceResult.converged,
      confidenceScore: convergenceResult.confidenceScore,
    };
  }
);
