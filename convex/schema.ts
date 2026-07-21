import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ──────────────────────────────────────────────────────────────────
  // scamSessions
  // Active and historical scam-call sessions. Each session tracks a
  // live or recorded call transcript, a rolling risk score produced by
  // the Scam Session Classifier agent, and a lifecycle status that
  // drives the command-center UI filtering.
  // ──────────────────────────────────────────────────────────────────
  scamSessions: defineTable({
    sessionId: v.string(),
    transcriptChunks: v.array(
      v.object({
        text: v.string(),
        timestamp: v.number(),
        speaker: v.string(),
      })
    ),
    riskScore: v.number(), // 0–100
    status: v.union(
      v.literal("monitoring"),
      v.literal("flagged"),
      v.literal("confirmed"),
      v.literal("resolved")
    ),
    lastReasoning: v.optional(v.string()), // Brief AI reasoning for the latest risk score change
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  // ──────────────────────────────────────────────────────────────────
  // entities
  // Canonical nodes in the fraud-network graph. Every phone number,
  // UPI ID, device fingerprint, bank account, currency-note serial,
  // or person ever observed in a scam session or seizure report is
  // deduplicated here as a single entity with a risk weight.
  // ──────────────────────────────────────────────────────────────────
  entities: defineTable({
    entityId: v.string(),
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
  })
    .index("by_entityId", ["entityId"])
    .index("by_type_value", ["type", "value"]),

  // ──────────────────────────────────────────────────────────────────
  // graphEdges
  // Bidirectional relationships between entities. Each edge carries a
  // typed relationship label and a confidence score (0–1). The graph
  // agent traverses these edges to detect convergence between
  // digital-arrest clusters and counterfeit-currency clusters.
  // ──────────────────────────────────────────────────────────────────
  graphEdges: defineTable({
    fromEntityId: v.string(),
    toEntityId: v.string(),
    relationshipType: v.string(), // e.g. "co-occurred-in-call", "shared-transaction", "shared-device"
    confidence: v.number(), // 0–1
    sourceEventId: v.string(),
    createdAt: v.number(),
  })
    .index("by_fromEntityId", ["fromEntityId"])
    .index("by_toEntityId", ["toEntityId"]),

  // ──────────────────────────────────────────────────────────────────
  // evidencePackages
  // Court-admissible-style dossiers assembled by the Evidence
  // Packaging Agent. Each package links related sessions and entities
  // to a chronological, source-cited timeline. The confidence score
  // is a weighted average of all edge confidences involved.
  // ──────────────────────────────────────────────────────────────────
  evidencePackages: defineTable({
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
  }),

  // ──────────────────────────────────────────────────────────────────
  // complaintLocations
  // Geo-located complaint pins for the heatmap overlay. Each pin is
  // typed as either a digital-arrest report or a counterfeit-seizure
  // report, enabling the convergence layer to visualise geographic
  // overlap between the two crime categories.
  // ──────────────────────────────────────────────────────────────────
  complaintLocations: defineTable({
    locationId: v.string(),
    lat: v.number(),
    lng: v.number(),
    type: v.union(
      v.literal("digital-arrest"),
      v.literal("counterfeit-seizure")
    ),
    severity: v.number(),
    relatedSessionId: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    reportedAt: v.number(),
  }).index("by_type", ["type"]),

  // ──────────────────────────────────────────────────────────────────
  // advisories
  // RAG corpus of regulatory advisory chunks. Each chunk is embedded
  // and indexed for vector search so agents can ground their citations
  // in real advisory content rather than static keyword matching.
  // ──────────────────────────────────────────────────────────────────
  advisories: defineTable({
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
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
  }),

  // ──────────────────────────────────────────────────────────────────
  // alertLog
  // Multi-channel alert dispatch records. Each entry represents a
  // simulated alert sent to a bank, telecom carrier, or citizen.
  // These are demo-purpose dispatches — no real external API calls.
  // ──────────────────────────────────────────────────────────────────
  alertLog: defineTable({
    alertId: v.string(),
    sessionId: v.string(),
    channel: v.union(
      v.literal("bank"),
      v.literal("telecom"),
      v.literal("citizen")
    ),
    status: v.union(v.literal("sent"), v.literal("acked")),
    message: v.string(),
    dispatchedAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_dispatchedAt", ["dispatchedAt"]),
});
