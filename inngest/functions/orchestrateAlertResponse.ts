import { inngest } from "../client";
import {
  buildEvidencePackage,
  type EvidenceDataAccess,
  type ScamSession,
  type EntityRecord,
  type EdgeRecord,
  type EvidencePackage,
  type RagSearchFn,
} from "@/lib/agents/evidencePackaging";
import { findRelatedPatterns } from "@/lib/agents/incidentPattern";
import { embedText } from "@/lib/embeddings";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  formatBankAlertMessage,
  formatTelecomAlertMessage,
  formatCitizenWarningMessage,
} from "@/convex/alerts";

// ─── RAG Search factory ─────────────────────────────────────────
// Creates a RagSearchFn that uses embedText + Convex searchAdvisories.

function createRagSearch(convexUrl: string): RagSearchFn {
  const client = new ConvexHttpClient(convexUrl);
  return async (eventDescription: string) => {
    const embedding = await embedText(eventDescription);
    return await client.action(api.advisories.searchAdvisories, {
      queryEmbedding: embedding,
      topK: 2,
    });
  };
}

// ─── Convex-backed EvidenceDataAccess adapter ───────────────────

function createConvexEvidenceAccess(convexUrl: string): EvidenceDataAccess {
  const client = new ConvexHttpClient(convexUrl);

  return {
    async getSession(sessionId: string): Promise<ScamSession | null> {
      return await client.query(api.evidence.getSession, { sessionId });
    },
    async getEntitiesForSession(sessionId: string): Promise<EntityRecord[]> {
      return await client.query(api.evidence.getEntitiesForSession, {
        sessionId,
      });
    },
    async getEdgesForEntities(entityIds: string[]): Promise<EdgeRecord[]> {
      return await client.query(api.evidence.getEdgesForEntities, {
        entityIds,
      });
    },
    async getRelatedSessions(entityIds: string[]): Promise<ScamSession[]> {
      return await client.query(api.evidence.getRelatedSessions, {
        entityIds,
      });
    },
    async writeEvidencePackage(pkg: EvidencePackage): Promise<void> {
      await client.mutation(api.evidence.writeEvidencePackage, pkg);
    },
  };
}

/**
 * orchestrateAlertResponse
 *
 * Triggered when a session is flagged (risk threshold crossed) OR when a
 * graph convergence is detected (digital-arrest ↔ counterfeit link found).
 *
 * Fan-out to five independent, retryable steps:
 *   (a) Build a draft evidence package via the Evidence Packaging Agent (RAG-grounded)
 *   (b) Find related advisory patterns via the Incident Pattern Agent
 *   (c) Simulated bank alert dispatch → real Convex write to alertLog
 *   (d) Simulated telecom alert dispatch → real Convex write to alertLog
 *   (e) Simulated citizen warning dispatch → real Convex write to alertLog
 *
 * Each step uses step.run() for independent retryability and visibility
 * in the Inngest dashboard — this auditability is a deliberate feature.
 */
export const orchestrateAlertResponse = inngest.createFunction(
  {
    id: "orchestrate-alert-response",
    name: "Orchestrate Alert Response",
  },
  [
    { event: "scam/session.flagged" },
    { event: "graph/convergence.detected" },
  ],
  async ({ event, step }) => {
    const eventName = event.name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Inngest multi-trigger union requires cast
    const data = event.data as any;
    const sessionId =
      event.name === "scam/session.flagged"
        ? data.sessionId
        : `conv_session_${Date.now()}`;
    const triggerId =
      event.name === "scam/session.flagged"
        ? data.sessionId
        : data.convergenceId;

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
    const ragSearch = createRagSearch(convexUrl);
    const client = new ConvexHttpClient(convexUrl);

    // Step 1: Package evidence for the alert
    const evidencePackage = await step.run(
      "package-evidence",
      async () => {
        const dataAccess = createConvexEvidenceAccess(convexUrl);

        const input =
          event.name === "scam/session.flagged"
            ? {
                triggerType: "session-flagged" as const,
                sessionId: data.sessionId,
              }
            : {
                triggerType: "convergence-detected" as const,
                convergenceEventId: data.convergenceId,
              };

        return await buildEvidencePackage(input, dataAccess, ragSearch);
      }
    );

    // Step 2: (Stub) Find related patterns via vector search
    const patternMatch = await step.run(
      "find-related-patterns",
      async () => {
        const contextSummary =
          event.name === "scam/session.flagged"
            ? `Digital arrest scam session ${data.sessionId} flagged with risk score ${data.riskScore}. Suspected impersonation of law enforcement.`
            : `Graph convergence detected: entities linked across digital arrest and counterfeit currency categories. Convergence ID: ${data.convergenceId}.`;

        return await findRelatedPatterns(
          { contextSummary },
          ragSearch
        );
      }
    );

    // Step C: Simulated bank alert dispatch → real Convex write
    const bankAlert = await step.run(
      "dispatch-bank-alert",
      async () => {
        const alertId = `alert_bank_${Date.now()}`;
        const message = formatBankAlertMessage(sessionId, evidencePackage.packageId);
        await client.mutation(api.alerts.logAlertDispatch, {
          alertId,
          sessionId,
          channel: "bank",
          message,
        });
        return { dispatched: true, channel: "bank" as const, alertId };
      }
    );

    // Step D: Simulated telecom alert dispatch → real Convex write
    const telecomAlert = await step.run(
      "dispatch-telecom-alert",
      async () => {
        const alertId = `alert_telecom_${Date.now()}`;
        const message = formatTelecomAlertMessage(sessionId, evidencePackage.packageId);
        await client.mutation(api.alerts.logAlertDispatch, {
          alertId,
          sessionId,
          channel: "telecom",
          message,
        });
        return { dispatched: true, channel: "telecom" as const, alertId };
      }
    );

    // Step E: Simulated citizen warning dispatch → real Convex write
    const citizenWarning = await step.run(
      "dispatch-citizen-warning",
      async () => {
        const alertId = `alert_citizen_${Date.now()}`;
        const message = formatCitizenWarningMessage(sessionId, evidencePackage.packageId);
        await client.mutation(api.alerts.logAlertDispatch, {
          alertId,
          sessionId,
          channel: "citizen",
          message,
        });
        return { dispatched: true, channel: "citizen" as const, alertId };
      }
    );

    return {
      triggerEvent: eventName,
      triggerId,
      evidencePackageId: evidencePackage.packageId,
      patternSummary: patternMatch.patternSummary,
      relatedAdvisoryCount: patternMatch.relatedAdvisories.length,
      bankAlertDispatched: bankAlert.dispatched,
      telecomAlertDispatched: telecomAlert.dispatched,
      citizenWarningDispatched: citizenWarning.dispatched,
    };
  }
);
