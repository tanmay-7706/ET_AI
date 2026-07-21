"use node";

import { action } from "./_generated/server";

/**
 * startDemoScenario — Public action that sends the "demo/scenario.start"
 * event to Inngest. This is the single function the frontend calls to
 * kick off the live playback of the entire demo narrative.
 *
 * The Gemini track will wire a "Run Live Scenario" button to this action.
 */
export const startDemoScenario = action({
  args: {},
  handler: async () => {
    // For local dev, send directly to the Inngest dev server
    const inngestBaseUrl = process.env.INNGEST_BASE_URL || "http://127.0.0.1:8288";
    const eventUrl = process.env.INNGEST_EVENT_KEY
      ? `https://inn.gs/e/${process.env.INNGEST_EVENT_KEY}`
      : `${inngestBaseUrl}/e/test`;

    const response = await fetch(eventUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "demo/scenario.start",
        data: {
          triggeredAt: Date.now(),
          triggeredBy: "command-center-ui",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send demo event to Inngest: ${response.status} ${errorText}`);
    }

    return { started: true, triggeredAt: Date.now() };
  },
});
