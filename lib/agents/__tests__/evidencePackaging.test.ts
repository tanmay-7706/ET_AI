import { describe, it, expect, vi } from "vitest";
import {
  constructTimeline,
  computePackageConfidence,
  buildEvidencePackage,
  findBestCitation,
  type ScamSession,
  type EntityRecord,
  type EdgeRecord,
  type EvidenceDataAccess,
  type EvidencePackage,
  type RagSearchFn,
  type AdvisorySearchResult,
} from "../evidencePackaging";

// ─── Test Data Factories ─────────────────────────────────────────

function makeSession(overrides: Partial<ScamSession> = {}): ScamSession {
  return {
    sessionId: "session_1",
    transcriptChunks: [
      { text: "This is CBI, you are under digital arrest", timestamp: 1000, speaker: "scammer" },
      { text: "What? I haven't done anything!", timestamp: 1500, speaker: "victim" },
    ],
    riskScore: 85,
    status: "flagged",
    createdAt: 500,
    updatedAt: 2000,
    ...overrides,
  };
}

function makeEntity(overrides: Partial<EntityRecord> = {}): EntityRecord {
  return {
    entityId: "entity_phone_1",
    type: "phone",
    value: "+91-9876543210",
    firstSeenAt: 800,
    riskWeight: 0.7,
    ...overrides,
  };
}

function makeEdge(overrides: Partial<EdgeRecord> = {}): EdgeRecord {
  return {
    edgeId: "edge_1",
    fromEntityId: "entity_phone_1",
    toEntityId: "entity_bank_1",
    relationshipType: "shared-transaction",
    confidence: 0.8,
    sourceEventId: "event_1",
    createdAt: 1200,
    ...overrides,
  };
}

// ─── Mock RAG Search ─────────────────────────────────────────────

const mockAdvisoryResult: AdvisorySearchResult = {
  advisoryId: "adv_da_01",
  sourceTitle: "Advisory on Digital Arrest Scam Patterns",
  sourceType: "NCRB",
  chunkText: "Digital arrest scams involve criminals impersonating law enforcement officers via video calls.",
  score: 0.92,
};

const mockRagSearch: RagSearchFn = vi.fn().mockResolvedValue([mockAdvisoryResult]);
const emptyRagSearch: RagSearchFn = vi.fn().mockResolvedValue([]);
const failingRagSearch: RagSearchFn = vi.fn().mockRejectedValue(new Error("RAG unavailable"));

// ─── Tests ───────────────────────────────────────────────────────

describe("findBestCitation", () => {
  it("returns RAG-grounded citation when ragSearch is provided", async () => {
    const citation = await findBestCitation("digital-arrest scam detected", "evt_1", mockRagSearch);
    expect(citation).toContain("NCRB");
    expect(citation).toContain("Advisory on Digital Arrest Scam Patterns");
  });

  it("falls back to internal event ID when RAG returns no results", async () => {
    const citation = await findBestCitation("something unrelated", "evt_99", emptyRagSearch);
    expect(citation).toBe("Internal Event: evt_99");
  });

  it("falls back to internal event ID when RAG fails", async () => {
    const citation = await findBestCitation("digital-arrest", "evt_1", failingRagSearch);
    expect(citation).toBe("Internal Event: evt_1");
  });

  it("falls back to internal event ID when no ragSearch provided", async () => {
    const citation = await findBestCitation("anything", "evt_42");
    expect(citation).toBe("Internal Event: evt_42");
  });
});

describe("constructTimeline", () => {
  it("produces chronologically sorted entries with RAG citations", async () => {
    const sessions = [makeSession()];
    const entities = [makeEntity()];
    const edges = [makeEdge()];

    const timeline = await constructTimeline(sessions, entities, edges, mockRagSearch);

    // All entries must have sourceCitation (hard requirement)
    for (const entry of timeline) {
      expect(entry.sourceCitation).toBeTruthy();
      expect(entry.sourceCitation.length).toBeGreaterThan(0);
    }

    // Should be chronologically sorted
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].timestamp).toBeGreaterThanOrEqual(
        timeline[i - 1].timestamp
      );
    }

    // Should contain session, transcript, entity, and edge events
    expect(timeline.length).toBeGreaterThanOrEqual(5);
  });

  it("handles empty inputs without crashing", async () => {
    const timeline = await constructTimeline([], [], []);
    expect(timeline).toHaveLength(0);
  });

  it("includes all transcript chunks in the timeline", async () => {
    const session = makeSession({
      transcriptChunks: [
        { text: "Chunk A", timestamp: 100, speaker: "s1" },
        { text: "Chunk B", timestamp: 200, speaker: "s2" },
        { text: "Chunk C", timestamp: 300, speaker: "s1" },
      ],
    });

    const timeline = await constructTimeline([session], [], []);

    const chunkEvents = timeline.filter((t) =>
      t.event.includes("Chunk")
    );
    expect(chunkEvents).toHaveLength(3);
  });
});

describe("computePackageConfidence", () => {
  it("computes weighted average of edge confidences", () => {
    const edges = [
      makeEdge({ confidence: 0.8 }),
      makeEdge({ confidence: 0.6, edgeId: "e2" }),
      makeEdge({ confidence: 0.4, edgeId: "e3" }),
    ];

    const confidence = computePackageConfidence(edges, []);
    expect(confidence).toBeCloseTo(0.6, 5); // (0.8 + 0.6 + 0.4) / 3
  });

  it("falls back to normalised session risk when no edges", () => {
    const sessions = [
      makeSession({ riskScore: 80 }),
      makeSession({ sessionId: "s2", riskScore: 60 }),
    ];

    const confidence = computePackageConfidence([], sessions);
    expect(confidence).toBeCloseTo(0.7, 5); // (80 + 60) / 2 / 100
  });

  it("returns 0 when no data", () => {
    expect(computePackageConfidence([], [])).toBe(0);
  });
});

describe("buildEvidencePackage", () => {
  it("builds a complete draft evidence package with RAG citations", async () => {
    const session = makeSession();
    const entity = makeEntity();
    const edge = makeEdge();

    let writtenPackage: EvidencePackage | null = null;

    const mockDataAccess: EvidenceDataAccess = {
      getSession: vi.fn().mockResolvedValue(session),
      getEntitiesForSession: vi.fn().mockResolvedValue([entity]),
      getEdgesForEntities: vi.fn().mockResolvedValue([edge]),
      getRelatedSessions: vi.fn().mockResolvedValue([]),
      writeEvidencePackage: vi.fn().mockImplementation(async (pkg) => {
        writtenPackage = pkg;
      }),
    };

    const result = await buildEvidencePackage(
      { triggerType: "session-flagged", sessionId: "session_1" },
      mockDataAccess,
      mockRagSearch
    );

    // Package is assembled correctly
    expect(result.status).toBe("draft");
    expect(result.relatedSessionIds).toContain("session_1");
    expect(result.relatedEntityIds).toContain("entity_phone_1");
    expect(result.timeline.length).toBeGreaterThan(0);
    expect(result.confidenceScore).toBeGreaterThan(0);

    // Every timeline entry has a RAG-grounded citation
    for (const entry of result.timeline) {
      expect(entry.sourceCitation).toBeTruthy();
      expect(entry.sourceCitation).toContain("NCRB");
    }

    // Package was written to persistence
    expect(writtenPackage).not.toBeNull();
    expect(writtenPackage!.packageId).toBe(result.packageId);
  });

  it("handles missing session gracefully", async () => {
    const mockDataAccess: EvidenceDataAccess = {
      getSession: vi.fn().mockResolvedValue(null),
      getEntitiesForSession: vi.fn().mockResolvedValue([]),
      getEdgesForEntities: vi.fn().mockResolvedValue([]),
      getRelatedSessions: vi.fn().mockResolvedValue([]),
      writeEvidencePackage: vi.fn(),
    };

    const result = await buildEvidencePackage(
      { triggerType: "session-flagged", sessionId: "nonexistent" },
      mockDataAccess
    );

    expect(result.status).toBe("draft");
    expect(result.relatedSessionIds).toHaveLength(0);
    expect(result.timeline).toHaveLength(0);
    expect(result.confidenceScore).toBe(0);
  });
});
