// ═══════════════════════════════════════════════════════════════════
// Fraud Network Graph — Core Correlation Logic
// ═══════════════════════════════════════════════════════════════════
// Pure, framework-agnostic functions for entity graph operations and
// convergence detection. These are deliberately decoupled from Convex
// and Inngest so they can be unit-tested in isolation and tuned
// independently during the hackathon.
// ═══════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────

export type EntityType =
  | "phone"
  | "upiId"
  | "deviceFingerprint"
  | "bankAccount"
  | "currencyNoteSerial"
  | "person";

export type ClusterType = "digital-arrest" | "counterfeit-seizure";

export interface Entity {
  entityId: string;
  type: EntityType;
  value: string;
  firstSeenAt: number;
  riskWeight: number;
  /** Optional cluster tag derived from complaintLocations or metadata */
  clusterType?: ClusterType;
}

export interface GraphEdge {
  edgeId: string;
  fromEntityId: string;
  toEntityId: string;
  relationshipType: string;
  confidence: number;
  sourceEventId: string;
  createdAt: number;
}

export interface ConvergenceResult {
  converged: boolean;
  bridgeEntityId: string | null;
  clusterAType: ClusterType | null;
  clusterBType: ClusterType | null;
  confidenceScore: number;
  pathLength: number;
  /** Full path of entity IDs from cluster A to cluster B */
  path: string[];
}

export interface UpsertResult {
  entity: Entity;
  edges: GraphEdge[];
  isNewEntity: boolean;
}

// ─── Confidence Weight Map ───────────────────────────────────────
// Named constants for edge confidence by relationship type.
// Deliberately not magic numbers — tune these during the hackathon.

export const RELATIONSHIP_CONFIDENCE_WEIGHTS: Record<string, number> = {
  "co-occurred-in-call": 0.6,
  "shared-transaction": 0.8,
  "shared-device": 0.9,
};

/** Default confidence for unknown relationship types */
export const DEFAULT_CONFIDENCE = 0.5;

/**
 * Get the confidence weight for a relationship type.
 */
export function getConfidenceForRelationship(relationshipType: string): number {
  return (
    RELATIONSHIP_CONFIDENCE_WEIGHTS[relationshipType] ?? DEFAULT_CONFIDENCE
  );
}

// ─── Graph Data Access Interface ─────────────────────────────────
// Abstract interface so the traversal logic doesn't depend on Convex
// or any other persistence layer directly.

export interface GraphDataAccess {
  getEntity(entityId: string): Promise<Entity | null>;
  getEdgesFrom(entityId: string): Promise<GraphEdge[]>;
  getEdgesTo(entityId: string): Promise<GraphEdge[]>;
  upsertEntity(entity: Omit<Entity, "entityId"> & { entityId?: string }): Promise<Entity>;
  createEdge(edge: Omit<GraphEdge, "edgeId" | "createdAt"> & { edgeId?: string }): Promise<GraphEdge>;
}

// ─── Entity Upsert + Bidirectional Edge Creation ─────────────────

/**
 * Upserts an entity and creates bidirectional edges to all related entities.
 *
 * @param dataAccess - Abstract graph data access (Convex in production, mock in tests)
 * @param entityType - Type of the entity being upserted
 * @param entityValue - Value of the entity (phone number, UPI ID, etc.)
 * @param sourceEventId - ID of the event that triggered this upsert
 * @param relatedEntityIds - IDs of entities to link to
 * @param relationshipType - Type of relationship for the new edges
 * @returns The upserted entity and all created edges
 */
export async function upsertEntityAndEdges(
  dataAccess: GraphDataAccess,
  entityType: EntityType,
  entityValue: string,
  sourceEventId: string,
  relatedEntityIds: string[],
  relationshipType: string
): Promise<UpsertResult> {
  // Upsert the primary entity
  const entity = await dataAccess.upsertEntity({
    type: entityType,
    value: entityValue,
    firstSeenAt: Date.now(),
    riskWeight: getConfidenceForRelationship(relationshipType),
  });

  const confidence = getConfidenceForRelationship(relationshipType);
  const edges: GraphEdge[] = [];

  // Create bidirectional edges for each related entity
  for (const relatedId of relatedEntityIds) {
    // Forward edge: entity → related
    const forwardEdge = await dataAccess.createEdge({
      fromEntityId: entity.entityId,
      toEntityId: relatedId,
      relationshipType,
      confidence,
      sourceEventId,
    });
    edges.push(forwardEdge);

    // Reverse edge: related → entity
    const reverseEdge = await dataAccess.createEdge({
      fromEntityId: relatedId,
      toEntityId: entity.entityId,
      relationshipType,
      confidence,
      sourceEventId,
    });
    edges.push(reverseEdge);
  }

  return {
    entity,
    edges,
    isNewEntity: true, // The data access layer determines actual upsert semantics
  };
}

// ─── BFS Convergence Detection ───────────────────────────────────

/** Maximum BFS depth for convergence search */
export const MAX_TRAVERSAL_DEPTH = 3;

interface BFSNode {
  entityId: string;
  depth: number;
  /** Product of edge confidences along the path from origin */
  pathConfidence: number;
  /** Entity IDs along the path from origin to this node */
  path: string[];
}

/**
 * Detects convergence between two different cluster types in the
 * entity graph using breadth-first traversal.
 *
 * Starting from a newly created edge, performs BFS outward from both
 * endpoints (max depth 3). If any discovered node belongs to a cluster
 * type different from the origin cluster, convergence is detected.
 *
 * The convergence confidence score is the product of all edge confidences
 * along the shortest path connecting the two clusters.
 *
 * @param dataAccess - Abstract graph data access
 * @param fromEntityId - One endpoint of the newly created edge
 * @param toEntityId - Other endpoint of the newly created edge
 * @returns Convergence result with bridge entity, confidence, and path
 */
export async function detectConvergence(
  dataAccess: GraphDataAccess,
  fromEntityId: string,
  toEntityId: string
): Promise<ConvergenceResult> {
  const NO_CONVERGENCE: ConvergenceResult = {
    converged: false,
    bridgeEntityId: null,
    clusterAType: null,
    clusterBType: null,
    confidenceScore: 0,
    pathLength: 0,
    path: [],
  };

  // Determine the origin entity's cluster type
  const fromEntity = await dataAccess.getEntity(fromEntityId);
  const toEntity = await dataAccess.getEntity(toEntityId);

  if (!fromEntity || !toEntity) {
    return NO_CONVERGENCE;
  }

  // Try BFS from each endpoint that has a cluster type
  const startPoints: { entityId: string; clusterType: ClusterType }[] = [];
  if (fromEntity.clusterType) {
    startPoints.push({
      entityId: fromEntity.entityId,
      clusterType: fromEntity.clusterType,
    });
  }
  if (toEntity.clusterType) {
    startPoints.push({
      entityId: toEntity.entityId,
      clusterType: toEntity.clusterType,
    });
  }

  // If neither endpoint has a cluster type, still BFS to find any
  // cluster-tagged node and then continue searching for the other type
  if (startPoints.length === 0) {
    startPoints.push({ entityId: fromEntity.entityId, clusterType: undefined as unknown as ClusterType });
  }

  for (const start of startPoints) {
    const result = await bfsForConvergence(
      dataAccess,
      start.entityId,
      start.clusterType
    );
    if (result.converged) {
      return result;
    }
  }

  return NO_CONVERGENCE;
}

/**
 * BFS traversal from a starting entity, looking for a node belonging
 * to a different cluster type than `originClusterType`.
 */
async function bfsForConvergence(
  dataAccess: GraphDataAccess,
  startEntityId: string,
  originClusterType: ClusterType | undefined
): Promise<ConvergenceResult> {
  const visited = new Set<string>();
  const queue: BFSNode[] = [
    {
      entityId: startEntityId,
      depth: 0,
      pathConfidence: 1.0,
      path: [startEntityId],
    },
  ];

  // Track discovered cluster type if we didn't start with one
  let discoveredOriginCluster: ClusterType | undefined = originClusterType;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (visited.has(current.entityId)) {
      continue;
    }
    visited.add(current.entityId);

    // Check if this node has a cluster type
    const entity = await dataAccess.getEntity(current.entityId);
    if (!entity) continue;

    if (entity.clusterType) {
      if (!discoveredOriginCluster) {
        // First cluster type we find becomes our origin
        discoveredOriginCluster = entity.clusterType;
      } else if (entity.clusterType !== discoveredOriginCluster) {
        // Found a node in a different cluster — convergence!
        return {
          converged: true,
          bridgeEntityId: current.entityId,
          clusterAType: discoveredOriginCluster,
          clusterBType: entity.clusterType,
          confidenceScore: current.pathConfidence,
          pathLength: current.depth,
          path: current.path,
        };
      }
    }

    // Don't expand beyond max depth
    if (current.depth >= MAX_TRAVERSAL_DEPTH) {
      continue;
    }

    // Get all edges from this entity (both directions)
    const outEdges = await dataAccess.getEdgesFrom(current.entityId);
    const inEdges = await dataAccess.getEdgesTo(current.entityId);
    const allEdges = [...outEdges, ...inEdges];

    for (const edge of allEdges) {
      const neighborId =
        edge.fromEntityId === current.entityId
          ? edge.toEntityId
          : edge.fromEntityId;

      if (!visited.has(neighborId)) {
        queue.push({
          entityId: neighborId,
          depth: current.depth + 1,
          pathConfidence: current.pathConfidence * edge.confidence,
          path: [...current.path, neighborId],
        });
      }
    }
  }

  return {
    converged: false,
    bridgeEntityId: null,
    clusterAType: discoveredOriginCluster ?? null,
    clusterBType: null,
    confidenceScore: 0,
    pathLength: 0,
    path: [],
  };
}
