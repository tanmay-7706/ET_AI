import { mutation } from "./_generated/server";
import { clearAllDemoTables } from "./clearDemoData";

/**
 * Synthetic Data Seeder for Hackathon Demo
 * Idempotent mutation: clears existing data before seeding.
 *
 * This populates a specific narrative:
 * A digital-arrest scam session escalates in risk score, and
 * is linked via a shared bank account to a counterfeit currency seizure.
 */
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    // --- 1. CLEAR EXISTING DATA (Idempotent) ---
    await clearAllDemoTables(ctx);

    // --- 2. CREATE ENTITIES (Fictional) ---
    const now = Date.now();
    const entities = {
      scammerPhone: { type: "phone" as const, value: "+91-0000011111", riskWeight: 0.8 },
      victimPhone: { type: "phone" as const, value: "+91-9999988888", riskWeight: 0.2 },
      scamBankAccount: { type: "bankAccount" as const, value: "FAKE_BANK_0099887766", riskWeight: 0.9 },
      scamDevice: { type: "deviceFingerprint" as const, value: "DEV_FP_88A9B2", riskWeight: 0.7 },
      counterfeitNote: { type: "currencyNoteSerial" as const, value: "5AF 000000", riskWeight: 0.9 },
    };

    const entityIds: Record<keyof typeof entities, string> = {} as Record<keyof typeof entities, string>;

    for (const [key, data] of Object.entries(entities)) {
      const entityId = `mock_entity_${key}`;
      await ctx.db.insert("entities", {
        entityId,
        type: data.type,
        value: data.value,
        firstSeenAt: now - 86400000, // 1 day ago
        riskWeight: data.riskWeight,
      });
      entityIds[key as keyof typeof entities] = entityId;
    }

    // --- 3. CREATE SCAM SESSION ---
    const sessionId = "demo_session_da_01";
    // Simulate real-time escalation
    const transcriptChunks = [
      { text: "Hello, am I speaking to Mr. Sharma?", timestamp: now - 60000, speaker: "scammer" },
      { text: "Yes, who is this?", timestamp: now - 55000, speaker: "victim" },
      { text: "This is Inspector Singh from CBI. We have found a parcel in your name containing illegal passports.", timestamp: now - 50000, speaker: "scammer" },
      { text: "What? I didn't order any parcel! There must be a mistake.", timestamp: now - 45000, speaker: "victim" },
      { text: "Do not disconnect this video call. You are under digital arrest pending verification.", timestamp: now - 40000, speaker: "scammer" },
      { text: "You must transfer Rs 2 Lakhs to the RBI secure account immediately for verification, or we will dispatch a team to your home.", timestamp: now - 30000, speaker: "scammer" },
      { text: "Okay, okay, I will transfer it right away, please don't arrest me.", timestamp: now - 20000, speaker: "victim" },
    ];

    await ctx.db.insert("scamSessions", {
      sessionId,
      transcriptChunks,
      riskScore: 85, // Starts low, escalated to 85 by the end
      status: "flagged",
      createdAt: now - 60000,
      updatedAt: now,
    });

    // --- 4. CREATE GRAPH EDGES (The Convergence Story) ---
    // Link session entities together
    const edges = [
      // Scammer phone used scam device
      { from: entityIds.scammerPhone, to: entityIds.scamDevice, type: "shared-device", conf: 0.9 },
      // Victim called by scammer
      { from: entityIds.scammerPhone, to: entityIds.victimPhone, type: "co-occurred-in-call", conf: 0.6 },
      // Scammer requested funds to this bank account
      { from: entityIds.victimPhone, to: entityIds.scamBankAccount, type: "shared-transaction", conf: 0.8 },
      
      // *** THE CONVERGENCE TRIGGER ***
      // The scam bank account is linked to the counterfeit currency seizure!
      // This will trigger the convergence detection logic in Step 3.
      { from: entityIds.scamBankAccount, to: entityIds.counterfeitNote, type: "shared-transaction", conf: 0.85 },
    ];

    for (const edge of edges) {
      // Forward edge
      await ctx.db.insert("graphEdges", {
        fromEntityId: edge.from,
        toEntityId: edge.to,
        relationshipType: edge.type,
        confidence: edge.conf,
        sourceEventId: "seed_event",
        createdAt: now,
      });
      // Reverse edge
      await ctx.db.insert("graphEdges", {
        fromEntityId: edge.to,
        toEntityId: edge.from,
        relationshipType: edge.type,
        confidence: edge.conf,
        sourceEventId: "seed_event",
        createdAt: now,
      });
    }

    // --- 5. CREATE COMPLAINT LOCATIONS (Threat Map) ---
    const cities = [
      { name: "Mumbai", lat: 19.076, lng: 72.877 },
      { name: "Delhi", lat: 28.704, lng: 77.102 },
      { name: "Bengaluru", lat: 12.971, lng: 77.594 },
      { name: "Kolkata", lat: 22.572, lng: 88.363 },
      { name: "Hyderabad", lat: 17.385, lng: 78.486 },
    ];

    let locCounter = 1;
    for (const city of cities) {
      // Add a digital arrest report
      await ctx.db.insert("complaintLocations", {
        locationId: `loc_da_${locCounter++}`,
        lat: city.lat + (Math.random() - 0.5) * 0.1, // Slight jitter
        lng: city.lng + (Math.random() - 0.5) * 0.1,
        type: "digital-arrest",
        severity: Math.floor(Math.random() * 40) + 60, // 60-100
        reportedAt: now - Math.floor(Math.random() * 86400000),
      });

      // Add a counterfeit seizure report
      await ctx.db.insert("complaintLocations", {
        locationId: `loc_cf_${locCounter++}`,
        lat: city.lat + (Math.random() - 0.5) * 0.1,
        lng: city.lng + (Math.random() - 0.5) * 0.1,
        type: "counterfeit-seizure",
        severity: Math.floor(Math.random() * 40) + 60, // 60-100
        reportedAt: now - Math.floor(Math.random() * 86400000),
      });
    }

    // Ensure the convergence location links to our convergence trigger
    await ctx.db.insert("complaintLocations", {
        locationId: `loc_convergence_main`,
        lat: cities[0].lat + 0.05,
        lng: cities[0].lng + 0.05,
        type: "counterfeit-seizure",
        severity: 95,
        relatedEntityId: entityIds.counterfeitNote,
        reportedAt: now,
    });

    return "Seed complete! All tables populated for the demo.";
  },
});
