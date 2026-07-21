import { Inngest, EventSchemas } from "inngest";

// ─── Event Type Definitions ──────────────────────────────────────
// Every event flowing through the pipeline is explicitly typed here.
// This is the single source of truth for event contracts.

type Events = {
  "scam/transcript.chunk.received": {
    data: {
      sessionId: string;
      chunkText: string;
      timestamp: number;
      speaker: string;
    };
  };
  "scam/session.flagged": {
    data: {
      sessionId: string;
      riskScore: number;
      flaggedAt: number;
    };
  };
  "entity/mention.detected": {
    data: {
      entityType:
        | "phone"
        | "upiId"
        | "deviceFingerprint"
        | "bankAccount"
        | "currencyNoteSerial"
        | "person";
      entityValue: string;
      sourceEventId: string;
      relatedEntityIds: string[];
    };
  };
  "graph/edge.created": {
    data: {
      edgeId: string;
      fromEntityId: string;
      toEntityId: string;
      relationshipType: string;
      confidence: number;
    };
  };
  "graph/convergence.detected": {
    data: {
      convergenceId: string;
      bridgeEntityId: string;
      clusterAType: string;
      clusterBType: string;
      confidenceScore: number;
      pathLength: number;
    };
  };
  "demo/scenario.start": {
    data: {
      triggeredAt: number;
      triggeredBy: string;
    };
  };
};

// ─── Inngest Client ──────────────────────────────────────────────
export const inngest = new Inngest({
  id: "digital-safety-shield",
  schemas: new EventSchemas().fromRecord<Events>(),
});
