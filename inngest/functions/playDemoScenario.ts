import { inngest } from "../client";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * The demo session ID used consistently across seed data and live playback.
 */
const DEMO_SESSION_ID = "demo_session_da_01";

/**
 * Pre-authored transcript chunks reused from seed.ts's demo narrative.
 * These are played back one at a time with step.sleep() between each
 * so the risk score visibly climbs during a live demo.
 */
const DEMO_TRANSCRIPT_CHUNKS = [
  { text: "Hello, am I speaking to Mr. Sharma?", speaker: "scammer" },
  { text: "Yes, who is this?", speaker: "victim" },
  { text: "This is Inspector Singh from CBI. We have found a parcel in your name containing illegal passports.", speaker: "scammer" },
  { text: "What? I didn't order any parcel! There must be a mistake.", speaker: "victim" },
  { text: "Do not disconnect this video call. You are under digital arrest pending verification.", speaker: "scammer" },
  { text: "You must transfer Rs 2 Lakhs to the RBI secure account immediately for verification, or we will dispatch a team to your home.", speaker: "scammer" },
  { text: "Okay, okay, I will transfer it right away, please don't arrest me.", speaker: "victim" },
];

/**
 * Demo entity data — used to seed entities and trigger convergence mid-scenario.
 */
const DEMO_ENTITIES = {
  scammerPhone: { type: "phone" as const, value: "+91-0000011111", riskWeight: 0.8 },
  victimPhone: { type: "phone" as const, value: "+91-9999988888", riskWeight: 0.2 },
  scamBankAccount: { type: "bankAccount" as const, value: "FAKE_BANK_0099887766", riskWeight: 0.9 },
  scamDevice: { type: "deviceFingerprint" as const, value: "DEV_FP_88A9B2", riskWeight: 0.7 },
  counterfeitNote: { type: "currencyNoteSerial" as const, value: "5AF 000000", riskWeight: 0.9 },
};

/**
 * playDemoScenario
 *
 * THE MOST IMPORTANT FUNCTION FOR LIVE DEMO.
 *
 * Plays the demo story out as real events in real time, so a judge watching
 * the command center screen sees the risk score climb chunk-by-chunk and
 * then sees the convergence edge appear.
 *
 * Uses step.sleep() (durable, survives page refresh) — NOT setTimeout.
 * Each phase is visible in the Inngest dashboard.
 * Safely re-runnable (clears all demo tables at start).
 */
export const playDemoScenario = inngest.createFunction(
  {
    id: "play-demo-scenario",
    name: "Play Demo Scenario (Live Playback)",
  },
  { event: "demo/scenario.start" },
  async ({ step }) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const client = new ConvexHttpClient(convexUrl);

    // ── Phase A: Clear/reset all demo tables ──────────────────────
    await step.run("reset-demo-data", async () => {
      await client.mutation(api.clearDemoData.resetDemoData, {});
      return "Demo tables cleared";
    });

    // Brief pause to let the UI react to the empty state
    await step.sleep("pause-after-reset", "2s");

    // ── Phase B: Create fresh scam session ────────────────────────
    await step.run("create-fresh-session", async () => {
      await client.mutation(api.evidence.createDemoSession, {
        sessionId: DEMO_SESSION_ID,
      });
      return "Fresh session created";
    });

    // ── Phase C: Seed entities (needed for convergence later) ─────
    await step.run("seed-demo-entities", async () => {
      const now = Date.now();
      for (const [key, data] of Object.entries(DEMO_ENTITIES)) {
        await client.mutation(api.graph.upsertEntity, {
          entityId: `mock_entity_${key}`,
          type: data.type,
          value: data.value,
          firstSeenAt: now - 86400000,
          riskWeight: data.riskWeight,
        });
      }
      return "Entities seeded";
    });

    // ── Phase D: Drip-feed transcript chunks ──────────────────────
    // Each chunk flows through the REAL classifyTranscriptChunk pipeline.
    const convergenceChunkIndex = 4; // After chunk 5 (0-indexed), trigger convergence

    for (let i = 0; i < DEMO_TRANSCRIPT_CHUNKS.length; i++) {
      const chunk = DEMO_TRANSCRIPT_CHUNKS[i];

      // Wait 3–4 seconds between chunks so the UI visibly updates
      await step.sleep(`pause-before-chunk-${i}`, i === 0 ? "1s" : "3.5s");

      // Send the chunk through the real classification pipeline
      await step.run(`send-chunk-${i}`, async () => {
        await inngest.send({
          name: "scam/transcript.chunk.received",
          data: {
            sessionId: DEMO_SESSION_ID,
            chunkText: chunk.text,
            speaker: chunk.speaker,
            timestamp: Date.now(),
          },
        });
        return `Chunk ${i} sent: [${chunk.speaker}]`;
      });

      // After the convergence chunk, trigger entity mention + graph edges
      if (i === convergenceChunkIndex) {
        await step.sleep("pause-before-convergence", "2s");

        // Seed graph edges that create the convergence path
        await step.run("seed-convergence-edges", async () => {
          const edges = [
            { from: "mock_entity_scammerPhone", to: "mock_entity_scamDevice", type: "shared-device", conf: 0.9 },
            { from: "mock_entity_scammerPhone", to: "mock_entity_victimPhone", type: "co-occurred-in-call", conf: 0.6 },
            { from: "mock_entity_victimPhone", to: "mock_entity_scamBankAccount", type: "shared-transaction", conf: 0.8 },
          ];

          for (const edge of edges) {
            await client.mutation(api.graph.createEdge, {
              fromEntityId: edge.from,
              toEntityId: edge.to,
              relationshipType: edge.type,
              confidence: edge.conf,
              sourceEventId: DEMO_SESSION_ID,
            });
            // Reverse edge
            await client.mutation(api.graph.createEdge, {
              fromEntityId: edge.to,
              toEntityId: edge.from,
              relationshipType: edge.type,
              confidence: edge.conf,
              sourceEventId: DEMO_SESSION_ID,
            });
          }
          return "Pre-convergence edges created";
        });

        await step.sleep("pause-before-convergence-trigger", "1.5s");

        // THE CONVERGENCE TRIGGER — counterfeit note linked to bank account
        await step.run("trigger-convergence-edge", async () => {
          // Forward edge
          const forwardEdge = await client.mutation(api.graph.createEdge, {
            fromEntityId: "mock_entity_scamBankAccount",
            toEntityId: "mock_entity_counterfeitNote",
            relationshipType: "shared-transaction",
            confidence: 0.85,
            sourceEventId: DEMO_SESSION_ID,
          });
          // Reverse edge
          await client.mutation(api.graph.createEdge, {
            fromEntityId: "mock_entity_counterfeitNote",
            toEntityId: "mock_entity_scamBankAccount",
            relationshipType: "shared-transaction",
            confidence: 0.85,
            sourceEventId: DEMO_SESSION_ID,
          });

          // Fire entity mention event to trigger convergence detection
          await inngest.send({
            name: "entity/mention.detected",
            data: {
              entityType: "currencyNoteSerial",
              entityValue: "5AF 000000",
              sourceEventId: DEMO_SESSION_ID,
              relatedEntityIds: ["mock_entity_scamBankAccount"],
            },
          });

          // Also fire the graph edge event to trigger checkConvergence
          await inngest.send({
            name: "graph/edge.created",
            data: {
              edgeId: forwardEdge.edgeId,
              fromEntityId: "mock_entity_scamBankAccount",
              toEntityId: "mock_entity_counterfeitNote",
              relationshipType: "shared-transaction",
              confidence: 0.85,
            },
          });

          return "Convergence edge + event fired";
        });
      }
    }

    // ── Phase E: Seed complaint locations for the threat map ──────
    await step.run("seed-complaint-locations", async () => {
      const cities = [
        { name: "Mumbai", lat: 19.076, lng: 72.877 },
        { name: "Delhi", lat: 28.704, lng: 77.102 },
        { name: "Bengaluru", lat: 12.971, lng: 77.594 },
        { name: "Kolkata", lat: 22.572, lng: 88.363 },
        { name: "Hyderabad", lat: 17.385, lng: 78.486 },
      ];

      const now = Date.now();
      let locCounter = 1;

      for (const city of cities) {
        await client.mutation(api.evidence.createComplaintLocation, {
          locationId: `loc_da_${locCounter++}`,
          lat: city.lat + (Math.random() - 0.5) * 0.1,
          lng: city.lng + (Math.random() - 0.5) * 0.1,
          type: "digital-arrest",
          severity: Math.floor(Math.random() * 40) + 60,
          reportedAt: now - Math.floor(Math.random() * 86400000),
        });

        await client.mutation(api.evidence.createComplaintLocation, {
          locationId: `loc_cf_${locCounter++}`,
          lat: city.lat + (Math.random() - 0.5) * 0.1,
          lng: city.lng + (Math.random() - 0.5) * 0.1,
          type: "counterfeit-seizure",
          severity: Math.floor(Math.random() * 40) + 60,
          reportedAt: now - Math.floor(Math.random() * 86400000),
        });
      }

      return "Complaint locations seeded";
    });

    return {
      completed: true,
      sessionId: DEMO_SESSION_ID,
      chunksPlayed: DEMO_TRANSCRIPT_CHUNKS.length,
    };
  }
);
