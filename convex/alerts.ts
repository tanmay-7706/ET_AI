import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * logAlertDispatch — Internal mutation to insert a record into alertLog.
 *
 * Called by the orchestrateAlertResponse Inngest function to record
 * simulated multi-channel alert dispatches (bank, telecom, citizen).
 * These are demo-purpose writes — no real external API calls are made.
 */
export const logAlertDispatch = mutation({
  args: {
    alertId: v.string(),
    sessionId: v.string(),
    channel: v.union(
      v.literal("bank"),
      v.literal("telecom"),
      v.literal("citizen")
    ),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("alertLog", {
      alertId: args.alertId,
      sessionId: args.sessionId,
      channel: args.channel,
      status: "sent",
      message: args.message,
      dispatchedAt: Date.now(),
    });
  },
});

// ─── Message formatting helpers ─────────────────────────────────
// Exported for unit testing; used by the Inngest orchestration steps.

/**
 * Formats a simulated bank alert message for a given session.
 */
export function formatBankAlertMessage(sessionId: string, evidencePackageId: string): string {
  return `[SIMULATED] Hold flag raised on linked account(s) pending verification. Session: ${sessionId}, Evidence: ${evidencePackageId}`;
}

/**
 * Formats a simulated telecom alert message for a given session.
 */
export function formatTelecomAlertMessage(sessionId: string, evidencePackageId: string): string {
  return `[SIMULATED] Spoofed-number flag sent to telecom carrier for call intercept. Session: ${sessionId}, Evidence: ${evidencePackageId}`;
}

/**
 * Formats a simulated citizen warning message for a given session.
 */
export function formatCitizenWarningMessage(sessionId: string, evidencePackageId: string): string {
  return `[SIMULATED] SMS/push warning dispatched to registered contact for potential scam alert. Session: ${sessionId}, Evidence: ${evidencePackageId}`;
}
