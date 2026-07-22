import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { clearAllDemoTables } from "./clearDemoData";

const DEMO_SESSION_ID = "demo_session_da_01";

const DEMO_TRANSCRIPT_CHUNKS = [
  { text: "Hello, am I speaking to Mr. Sharma?", speaker: "scammer", risk: 10, reasoning: "Standard greeting, neutral risk." },
  { text: "Yes, who is this?", speaker: "victim", risk: 10, reasoning: "Neutral response." },
  { text: "This is Inspector Singh from CBI. We have found a parcel in your name containing illegal passports.", speaker: "scammer", risk: 45, reasoning: "Law enforcement impersonation detected." },
  { text: "What? I didn't order any parcel! There must be a mistake.", speaker: "victim", risk: 45, reasoning: "Victim expresses confusion." },
  { text: "Do not disconnect this video call. You are under digital arrest pending verification.", speaker: "scammer", risk: 85, reasoning: "Explicit digital arrest threat identified." },
  { text: "You must transfer Rs 2 Lakhs to the RBI secure account immediately for verification, or we will dispatch a team to your home.", speaker: "scammer", risk: 95, reasoning: "Urgent financial demand combined with threat." },
  { text: "Okay, okay, I will transfer it right away, please don't arrest me.", speaker: "victim", risk: 98, reasoning: "Victim compliance with extortion demand." },
];

export const startDemoSequence = mutation({
  args: {},
  handler: async (ctx) => {
    await clearAllDemoTables(ctx);

    const now = Date.now();
    await ctx.db.insert("scamSessions", {
      sessionId: DEMO_SESSION_ID,
      transcriptChunks: [],
      riskScore: 0,
      status: "monitoring",
      createdAt: now,
      updatedAt: now,
    });

    const entities = {
      scammerPhone: { type: "phone", value: "+91-0000011111", riskWeight: 0.8 },
      victimPhone: { type: "phone", value: "+91-9999988888", riskWeight: 0.2 },
      scamBankAccount: { type: "bankAccount", value: "FAKE_BANK_0099887766", riskWeight: 0.9 },
      scamDevice: { type: "deviceFingerprint", value: "DEV_FP_88A9B2", riskWeight: 0.7 },
      counterfeitNote: { type: "currencyNoteSerial", value: "5AF 000000", riskWeight: 0.9 },
    };
    for (const [key, data] of Object.entries(entities)) {
      await ctx.db.insert("entities", {
        entityId: `mock_entity_${key}`,
        type: data.type as any,
        value: data.value,
        firstSeenAt: now - 86400000,
        riskWeight: data.riskWeight,
      });
    }

    const cities = [
      { name: "Mumbai", lat: 19.076, lng: 72.877 },
      { name: "Delhi", lat: 28.704, lng: 77.102 },
      { name: "Bengaluru", lat: 12.971, lng: 77.594 },
      { name: "Kolkata", lat: 22.572, lng: 88.363 },
      { name: "Hyderabad", lat: 17.385, lng: 78.486 },
    ];

    let locCounter = 1;
    for (const city of cities) {
      await ctx.db.insert("complaintLocations", {
        locationId: `loc_da_${locCounter++}`,
        lat: city.lat + (Math.random() - 0.5) * 0.1,
        lng: city.lng + (Math.random() - 0.5) * 0.1,
        type: "digital-arrest",
        severity: Math.floor(Math.random() * 40) + 60,
        reportedAt: now - Math.floor(Math.random() * 86400000),
      });

      await ctx.db.insert("complaintLocations", {
        locationId: `loc_cf_${locCounter++}`,
        lat: city.lat + (Math.random() - 0.5) * 0.1,
        lng: city.lng + (Math.random() - 0.5) * 0.1,
        type: "counterfeit-seizure",
        severity: Math.floor(Math.random() * 40) + 60,
        reportedAt: now - Math.floor(Math.random() * 86400000),
      });
    }
    
    // Add convergence main location so ThreatMap looks active
    await ctx.db.insert("complaintLocations", {
        locationId: `loc_convergence_main`,
        lat: cities[0].lat + 0.05,
        lng: cities[0].lng + 0.05,
        type: "counterfeit-seizure",
        severity: 95,
        relatedEntityId: "mock_entity_counterfeitNote",
        reportedAt: now,
    });
  }
});

export const processDemoChunk = mutation({
  args: { stepIndex: v.number() },
  handler: async (ctx, args) => {
    const chunk = DEMO_TRANSCRIPT_CHUNKS[args.stepIndex];
    if (!chunk) return;

    const now = Date.now();
    const sessionDoc = await ctx.db.query("scamSessions")
      .filter(q => q.eq(q.field("sessionId"), DEMO_SESSION_ID))
      .first();

    if (sessionDoc) {
      const newStatus = chunk.risk >= 70 ? "flagged" : "monitoring";
      
      const newChunk = {
        text: chunk.text,
        speaker: chunk.speaker,
        timestamp: now,
      };

      await ctx.db.patch(sessionDoc._id, {
        transcriptChunks: [...(sessionDoc.transcriptChunks || []), newChunk],
        riskScore: chunk.risk,
        status: newStatus as any,
        lastReasoning: chunk.reasoning,
        updatedAt: now,
      });
    }

    if (args.stepIndex === 4) {
      // Create pre-convergence edges
      const edges = [
        { from: "mock_entity_scammerPhone", to: "mock_entity_scamDevice", type: "shared-device", conf: 0.9 },
        { from: "mock_entity_scammerPhone", to: "mock_entity_victimPhone", type: "co-occurred-in-call", conf: 0.6 },
        { from: "mock_entity_victimPhone", to: "mock_entity_scamBankAccount", type: "shared-transaction", conf: 0.8 },
      ];
      for (const edge of edges) {
        await ctx.db.insert("graphEdges", { fromEntityId: edge.from, toEntityId: edge.to, relationshipType: edge.type, confidence: edge.conf, sourceEventId: DEMO_SESSION_ID, createdAt: now });
        await ctx.db.insert("graphEdges", { fromEntityId: edge.to, toEntityId: edge.from, relationshipType: edge.type, confidence: edge.conf, sourceEventId: DEMO_SESSION_ID, createdAt: now });
      }
    }

    if (args.stepIndex === 5) {
      // Trigger convergence edge
      await ctx.db.insert("graphEdges", { fromEntityId: "mock_entity_scamBankAccount", toEntityId: "mock_entity_counterfeitNote", relationshipType: "shared-transaction", confidence: 0.85, sourceEventId: DEMO_SESSION_ID, createdAt: now });
      await ctx.db.insert("graphEdges", { fromEntityId: "mock_entity_counterfeitNote", toEntityId: "mock_entity_scamBankAccount", relationshipType: "shared-transaction", confidence: 0.85, sourceEventId: DEMO_SESSION_ID, createdAt: now });

      // Create evidence package
      await ctx.db.insert("evidencePackages", {
        packageId: "ev_convergence_001",
        status: "finalized",
        relatedSessionIds: [DEMO_SESSION_ID],
        relatedEntityIds: ["mock_entity_counterfeitNote"],
        timeline: [{ timestamp: now, event: "Convergence detected", sourceCitation: "Internal system cross-match" }],
        confidenceScore: 0.92,
        createdAt: now,
      });
    }
    
    // Add alert log if crossing threshold
    if (chunk.risk >= 70 && args.stepIndex === 4) {
        await ctx.db.insert("alertLog", {
            alertId: "alert_001",
            sessionId: DEMO_SESSION_ID,
            channel: "bank",
            message: "Active extortion detected with high confidence.",
            status: "sent",
            dispatchedAt: now
        });
    }
  }
});
