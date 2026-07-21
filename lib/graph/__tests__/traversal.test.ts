import { describe, it, expect } from "vitest";
import {
  detectConvergence,
  upsertEntityAndEdges,
  getConfidenceForRelationship,
  RELATIONSHIP_CONFIDENCE_WEIGHTS,
  DEFAULT_CONFIDENCE,
  type GraphDataAccess,
  type Entity,
  type GraphEdge,
} from "../traversal";

// ─── Mock Graph Data Access ──────────────────────────────────────
// In-memory graph store for unit testing.

function createMockDataAccess(
  initialEntities: Entity[] = [],
  initialEdges: GraphEdge[] = []
): GraphDataAccess & {
  entities: Map<string, Entity>;
  edges: GraphEdge[];
} {
  const entities = new Map<string, Entity>();
  const edges: GraphEdge[] = [];

  for (const e of initialEntities) {
    entities.set(e.entityId, e);
  }
  for (const edge of initialEdges) {
    edges.push(edge);
  }

  let edgeCounter = 0;

  return {
    entities,
    edges,
    async getEntity(entityId: string) {
      return entities.get(entityId) ?? null;
    },
    async getEdgesFrom(entityId: string) {
      return edges.filter((e) => e.fromEntityId === entityId);
    },
    async getEdgesTo(entityId: string) {
      return edges.filter((e) => e.toEntityId === entityId);
    },
    async upsertEntity(entity) {
      const id = entity.entityId ?? `entity_${entities.size + 1}`;
      const full: Entity = {
        entityId: id,
        type: entity.type,
        value: entity.value,
        firstSeenAt: entity.firstSeenAt,
        riskWeight: entity.riskWeight,
        clusterType: entity.clusterType,
      };
      entities.set(id, full);
      return full;
    },
    async createEdge(edge) {
      edgeCounter++;
      const full: GraphEdge = {
        edgeId: edge.edgeId ?? `edge_${edgeCounter}`,
        fromEntityId: edge.fromEntityId,
        toEntityId: edge.toEntityId,
        relationshipType: edge.relationshipType,
        confidence: edge.confidence,
        sourceEventId: edge.sourceEventId,
        createdAt: Date.now(),
      };
      edges.push(full);
      return full;
    },
  };
}

// ─── Helper to build test entities ──────────────────────────────

function makeEntity(
  id: string,
  type: Entity["type"],
  clusterType?: Entity["clusterType"]
): Entity {
  return {
    entityId: id,
    type,
    value: `val_${id}`,
    firstSeenAt: Date.now(),
    riskWeight: 0.5,
    clusterType,
  };
}

function makeEdge(
  from: string,
  to: string,
  confidence = 0.8,
  relationship = "co-occurred-in-call"
): GraphEdge {
  return {
    edgeId: `edge_${from}_${to}`,
    fromEntityId: from,
    toEntityId: to,
    relationshipType: relationship,
    confidence,
    sourceEventId: "test-event",
    createdAt: Date.now(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────

describe("getConfidenceForRelationship", () => {
  it("returns correct weights for known relationship types", () => {
    expect(getConfidenceForRelationship("co-occurred-in-call")).toBe(0.6);
    expect(getConfidenceForRelationship("shared-transaction")).toBe(0.8);
    expect(getConfidenceForRelationship("shared-device")).toBe(0.9);
  });

  it("returns default confidence for unknown types", () => {
    expect(getConfidenceForRelationship("unknown-type")).toBe(DEFAULT_CONFIDENCE);
  });
});

describe("upsertEntityAndEdges", () => {
  it("creates an entity and bidirectional edges", async () => {
    const da = createMockDataAccess([
      makeEntity("existing_1", "phone"),
      makeEntity("existing_2", "bankAccount"),
    ]);

    const result = await upsertEntityAndEdges(
      da,
      "upiId",
      "user@paytm",
      "event_1",
      ["existing_1", "existing_2"],
      "shared-transaction"
    );

    // Entity was created
    expect(result.entity.type).toBe("upiId");
    expect(result.entity.value).toBe("user@paytm");

    // 2 related entities → 4 edges (2 bidirectional pairs)
    expect(result.edges).toHaveLength(4);

    // Check bidirectionality
    const fromNew = result.edges.filter(
      (e) => e.fromEntityId === result.entity.entityId
    );
    const toNew = result.edges.filter(
      (e) => e.toEntityId === result.entity.entityId
    );
    expect(fromNew).toHaveLength(2);
    expect(toNew).toHaveLength(2);

    // All edges should have the correct confidence
    for (const edge of result.edges) {
      expect(edge.confidence).toBe(
        RELATIONSHIP_CONFIDENCE_WEIGHTS["shared-transaction"]
      );
    }
  });
});

describe("detectConvergence", () => {
  it("returns no convergence for isolated clusters", async () => {
    // Two separate clusters with no shared nodes
    //
    //  [A1] ---> [A2]       (digital-arrest cluster)
    //  [B1] ---> [B2]       (counterfeit-seizure cluster)
    //
    const da = createMockDataAccess(
      [
        makeEntity("A1", "phone", "digital-arrest"),
        makeEntity("A2", "bankAccount", "digital-arrest"),
        makeEntity("B1", "currencyNoteSerial", "counterfeit-seizure"),
        makeEntity("B2", "person", "counterfeit-seizure"),
      ],
      [
        makeEdge("A1", "A2", 0.8),
        makeEdge("B1", "B2", 0.9),
      ]
    );

    const result = await detectConvergence(da, "A1", "A2");

    expect(result.converged).toBe(false);
    expect(result.bridgeEntityId).toBeNull();
  });

  it("detects strong convergence via direct shared node", async () => {
    // Direct bridge: A1 → BRIDGE ← B1
    // where A1 is digital-arrest and B1 is counterfeit-seizure
    //
    //  [A1] (digital-arrest) ---> [BRIDGE] <--- [B1] (counterfeit-seizure)
    //
    const da = createMockDataAccess(
      [
        makeEntity("A1", "phone", "digital-arrest"),
        makeEntity("BRIDGE", "deviceFingerprint"),
        makeEntity("B1", "currencyNoteSerial", "counterfeit-seizure"),
      ],
      [
        makeEdge("A1", "BRIDGE", 0.9, "shared-device"),
        makeEdge("B1", "BRIDGE", 0.85, "shared-device"),
      ]
    );

    // The new edge connects A1 and BRIDGE
    const result = await detectConvergence(da, "A1", "BRIDGE");

    // BFS from A1 (digital-arrest) should find B1 (counterfeit-seizure)
    // via BRIDGE → B1 edge (reverse direction)
    expect(result.converged).toBe(true);
    expect(result.clusterAType).toBe("digital-arrest");
    expect(result.clusterBType).toBe("counterfeit-seizure");
    expect(result.bridgeEntityId).toBe("B1");
    expect(result.pathLength).toBe(2); // A1 → BRIDGE → B1
    expect(result.confidenceScore).toBeGreaterThan(0);
  });

  it("detects weak convergence via long path with low confidence", async () => {
    // Long path: A1 → M1 → M2 → B1
    // where A1 is digital-arrest and B1 is counterfeit-seizure
    // Each edge has moderate confidence, so product is low
    //
    //  [A1] (digital-arrest) → [M1] → [M2] → [B1] (counterfeit-seizure)
    //       0.6                 0.5     0.5
    //
    const da = createMockDataAccess(
      [
        makeEntity("A1", "phone", "digital-arrest"),
        makeEntity("M1", "bankAccount"),
        makeEntity("M2", "upiId"),
        makeEntity("B1", "currencyNoteSerial", "counterfeit-seizure"),
      ],
      [
        makeEdge("A1", "M1", 0.6),
        makeEdge("M1", "M2", 0.5),
        makeEdge("M2", "B1", 0.5),
      ]
    );

    const result = await detectConvergence(da, "A1", "M1");

    expect(result.converged).toBe(true);
    expect(result.clusterAType).toBe("digital-arrest");
    expect(result.clusterBType).toBe("counterfeit-seizure");
    // Confidence should be product: 0.6 * 0.5 * 0.5 = 0.15
    // But BFS path from A1: A1(depth0) → M1(depth1, conf=0.6) → M2(depth2, conf=0.3) → B1(depth3, conf=0.15)
    expect(result.confidenceScore).toBeCloseTo(0.15, 1);
    expect(result.pathLength).toBe(3); // 3 hops
  });

  it("does not crash on circular graphs", async () => {
    // Circular: A1 → M1 → M2 → A1 (cycle, all same cluster)
    //
    //  [A1] (digital-arrest) → [M1] → [M2] → back to [A1]
    //
    const da = createMockDataAccess(
      [
        makeEntity("A1", "phone", "digital-arrest"),
        makeEntity("M1", "bankAccount", "digital-arrest"),
        makeEntity("M2", "upiId", "digital-arrest"),
      ],
      [
        makeEdge("A1", "M1", 0.8),
        makeEdge("M1", "M2", 0.7),
        makeEdge("M2", "A1", 0.6), // cycle back
      ]
    );

    const result = await detectConvergence(da, "A1", "M1");

    // No convergence — all same cluster type, and no crash from cycle
    expect(result.converged).toBe(false);
  });
});
