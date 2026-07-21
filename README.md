# Digital Safety Shield

AI-powered platform that detects digital-arrest scam sessions in progress and maps a shared fraud entity graph linking scam networks to counterfeit currency circulation.

## Stack

- **Frontend**: Next.js 15 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Backend**: Convex (real-time database + schema validation)
- **Auth**: Clerk (role-based: `officer` + `citizen`)
- **Orchestration**: Inngest (event-driven, durable workflows)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local  # Fill in Clerk + Convex keys

# Start the dev server
npm run dev

# In a separate terminal — start Convex
npx convex dev

# In a separate terminal — start Inngest dev server
npx inngest-cli@latest dev
```

## Schema Reference

### `scamSessions`
Active and historical scam-call sessions. Each session tracks a live or recorded call transcript, a rolling risk score produced by the Scam Session Classifier agent, and a lifecycle status that drives command-center UI filtering.

| Field | Type | Description |
|---|---|---|
| `sessionId` | `string` | Unique identifier for the scam session |
| `transcriptChunks` | `array` | Ordered transcript segments `{ text, timestamp, speaker }` |
| `riskScore` | `number` (0–100) | Rolling risk score from the classifier |
| `status` | `enum` | `"monitoring"` \| `"flagged"` \| `"confirmed"` \| `"resolved"` |
| `createdAt` | `number` | Epoch timestamp of session creation |
| `updatedAt` | `number` | Epoch timestamp of last update |

**Index**: `by_status` — filter sessions by lifecycle status.

---

### `entities`
Canonical nodes in the fraud-network graph. Every phone number, UPI ID, device fingerprint, bank account, currency-note serial, or person is deduplicated here with a risk weight.

| Field | Type | Description |
|---|---|---|
| `entityId` | `string` | Unique identifier |
| `type` | `enum` | `"phone"` \| `"upiId"` \| `"deviceFingerprint"` \| `"bankAccount"` \| `"currencyNoteSerial"` \| `"person"` |
| `value` | `string` | The entity's actual value (phone number, UPI ID, etc.) |
| `firstSeenAt` | `number` | When this entity was first observed |
| `riskWeight` | `number` | Computed risk weight |

**Indexes**: `by_entityId`, `by_type_value` — lookup by ID or dedup by type+value.

---

### `graphEdges`
Bidirectional relationships between entities. Each edge carries a typed relationship label and confidence score. The graph agent traverses these to detect convergence.

| Field | Type | Description |
|---|---|---|
| `fromEntityId` | `string` | Source entity |
| `toEntityId` | `string` | Target entity |
| `relationshipType` | `string` | e.g. `"co-occurred-in-call"`, `"shared-transaction"`, `"shared-device"` |
| `confidence` | `number` (0–1) | Edge confidence score |
| `sourceEventId` | `string` | ID of the originating event |
| `createdAt` | `number` | Epoch timestamp |

**Indexes**: `by_fromEntityId`, `by_toEntityId` — bidirectional edge lookup.

---

### `evidencePackages`
Court-admissible-style dossiers assembled by the Evidence Packaging Agent. Links sessions and entities to a chronological, source-cited timeline.

| Field | Type | Description |
|---|---|---|
| `packageId` | `string` | Unique identifier |
| `relatedSessionIds` | `array<string>` | Sessions included in this package |
| `relatedEntityIds` | `array<string>` | Entities included in this package |
| `timeline` | `array` | Chronological entries `{ timestamp, event, sourceCitation }` |
| `confidenceScore` | `number` | Weighted average of edge confidences |
| `status` | `enum` | `"draft"` \| `"finalized"` |
| `createdAt` | `number` | Epoch timestamp |

---

### `complaintLocations`
Geo-located complaint pins for heatmap overlay. Typed as digital-arrest or counterfeit-seizure to enable geographic convergence visualization.

| Field | Type | Description |
|---|---|---|
| `locationId` | `string` | Unique identifier |
| `lat` | `number` | Latitude |
| `lng` | `number` | Longitude |
| `type` | `enum` | `"digital-arrest"` \| `"counterfeit-seizure"` |
| `severity` | `number` | Severity rating |
| `relatedSessionId` | `string?` | Optional linked session |
| `relatedEntityId` | `string?` | Optional linked entity |
| `reportedAt` | `number` | Epoch timestamp |

**Index**: `by_type` — filter by complaint category for map rendering.

## Event Pipeline

```
scam/transcript.chunk.received
  → classifyTranscriptChunk → updates riskScore
    → (if ≥ 70) scam/session.flagged
      → orchestrateAlertResponse
        → buildEvidencePackage + bankAlert + citizenWarning

entity/mention.detected
  → enrichEntityGraph → upserts entity + creates edges
    → graph/edge.created
      → checkConvergence → BFS traversal (depth 3)
        → (if converged) graph/convergence.detected
          → orchestrateAlertResponse
```

## Testing

```bash
npm test                   # Run all unit tests
npm run test:watch         # Watch mode
```

Tests cover:
- Graph traversal: confidence weights, bidirectional edge creation, BFS convergence (no convergence, weak, strong, cycles)
- Evidence packaging: citation matching, timeline construction, confidence computation, full package assembly
# ET_AI
