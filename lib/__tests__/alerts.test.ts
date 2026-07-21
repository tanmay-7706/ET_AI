import { describe, it, expect } from "vitest";
import {
  formatBankAlertMessage,
  formatTelecomAlertMessage,
  formatCitizenWarningMessage,
} from "@/convex/alerts";

describe("Alert message formatting", () => {
  const sessionId = "demo_session_da_01";
  const evidencePackageId = "pkg_test_12345";

  it("bank alert message includes [SIMULATED] prefix, session ID, and evidence ID", () => {
    const message = formatBankAlertMessage(sessionId, evidencePackageId);

    // Must start with [SIMULATED] so no one mistakes it for a real integration
    expect(message).toMatch(/^\[SIMULATED\]/);
    // Must contain both identifiers for traceability
    expect(message).toContain(sessionId);
    expect(message).toContain(evidencePackageId);
    // Must mention the action (hold flag on account)
    expect(message.toLowerCase()).toContain("hold flag");
  });

  it("telecom alert message includes [SIMULATED] prefix, session ID, and evidence ID", () => {
    const message = formatTelecomAlertMessage(sessionId, evidencePackageId);

    expect(message).toMatch(/^\[SIMULATED\]/);
    expect(message).toContain(sessionId);
    expect(message).toContain(evidencePackageId);
    // Must mention telecom-specific action
    expect(message.toLowerCase()).toContain("telecom");
  });

  it("citizen warning message includes [SIMULATED] prefix and references the session", () => {
    const message = formatCitizenWarningMessage(sessionId, evidencePackageId);

    expect(message).toMatch(/^\[SIMULATED\]/);
    expect(message).toContain(sessionId);
    expect(message).toContain(evidencePackageId);
    // Must mention citizen-facing delivery
    expect(message.toLowerCase()).toContain("warning");
  });
});
