import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  classifyTranscriptChunk,
  enrichEntityGraph,
  checkConvergence,
  orchestrateAlertResponse,
  playDemoScenario,
} from "@/inngest/functions";

/**
 * Inngest API route — serves all registered functions to the Inngest
 * dev server (local) or Inngest Cloud (production). This is the single
 * endpoint Inngest uses to discover and invoke functions.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    classifyTranscriptChunk,
    enrichEntityGraph,
    checkConvergence,
    orchestrateAlertResponse,
    playDemoScenario,
  ],
});
