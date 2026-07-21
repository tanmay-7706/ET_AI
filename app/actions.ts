"use server";
import { inngest } from "@/inngest/client";

export async function triggerDemoScenario() {
  await inngest.send({
    name: "demo/scenario.start",
    data: {
      triggeredAt: Date.now(),
      triggeredBy: "command-center-ui",
    }
  });
}
