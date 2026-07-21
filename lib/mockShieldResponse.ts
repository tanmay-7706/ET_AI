export interface ShieldMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
  verdict?: {
    level: "low" | "medium" | "high" | "critical";
    score: number;
  };
  citedAdvisories?: {
    sourceTitle: string;
    sourceType: string;
  }[];
}

/**
 * Mock response function for the Citizen Fraud Shield chat UI.
 * Simulates a delay and returns a mocked analysis of the user's message.
 * This will be replaced by the real RAG-grounded agent later.
 * 
 * @param text The user's message
 * @returns A promise resolving to an assistant ShieldMessage
 */
export async function mockSendMessage(text: string): Promise<ShieldMessage> {
  // Simulate network latency (1.5s)
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const lowerText = text.toLowerCase();
  
  // Simple mock keyword detection for verdicts
  let verdict: ShieldMessage["verdict"] = undefined;
  let responseText = "I'm the Citizen Fraud Shield. How can I help you stay safe online?";

  if (lowerText.includes("arrest") || lowerText.includes("cbi") || lowerText.includes("customs")) {
    verdict = { level: "critical", score: 0.95 };
    responseText = "WARNING: Law enforcement agencies like CBI or Customs will NEVER ask you to transfer money or submit to a 'digital arrest' over a video call. Disconnect immediately. This is a known scam pattern.";
  } else if (lowerText.includes("link") || lowerText.includes("apk") || lowerText.includes("download")) {
    verdict = { level: "high", score: 0.82 };
    responseText = "Be very careful. Unverified APKs or links can install malware on your device. Do not download or install anything from unknown sources.";
  } else if (lowerText.includes("safe") || lowerText.includes("verified")) {
    verdict = { level: "low", score: 0.10 };
    responseText = "That sounds safe, but always remain vigilant and do not share OTPs or passwords.";
  }

  return {
    id: `msg_mock_${Date.now()}`,
    role: "assistant",
    text: responseText,
    timestamp: Date.now(),
    verdict,
  };
}
