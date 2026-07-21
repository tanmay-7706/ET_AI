import { describe, it, expect } from "vitest";
import { parseRiskScore } from "../openrouter";

describe("parseRiskScore", () => {
  it("extracts a clean integer score", () => {
    expect(parseRiskScore("85")).toBe(85);
  });

  it("extracts score from JSON-like response", () => {
    expect(parseRiskScore('{"score": 72, "reasoning": "suspicious patterns"}')).toBe(72);
  });

  it("extracts score embedded in explanation text", () => {
    expect(
      parseRiskScore(
        "Based on the transcript, I would rate the scam likelihood at 78 out of 100."
      )
    ).toBe(78);
  });

  it("returns null for text with no valid score", () => {
    expect(parseRiskScore("I cannot determine the risk")).toBeNull();
  });

  it("ignores numbers above 100", () => {
    // "150" is above 100, so it should be skipped; "65" is valid
    expect(parseRiskScore("The score is 150 but adjusted to 65")).toBe(65);
  });

  it("returns the first valid score in range", () => {
    expect(parseRiskScore("Score: 42. Alternative: 88.")).toBe(42);
  });

  it("handles empty string", () => {
    expect(parseRiskScore("")).toBeNull();
  });
});
