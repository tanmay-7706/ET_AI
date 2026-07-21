// ═══════════════════════════════════════════════════════════════════
// Incident Pattern Agent
// ═══════════════════════════════════════════════════════════════════
// Analyses a flagged session or convergence event by embedding a
// summary and searching the advisory corpus for matching precedent.
// Returns structured results for the orchestration pipeline.
// ═══════════════════════════════════════════════════════════════════

import { type AdvisorySearchResult, type RagSearchFn } from "./evidencePackaging";

export interface PatternMatchResult {
  relatedAdvisories: AdvisorySearchResult[];
  /** Human-readable summary of which precedent/guidance this matches.
   *  Currently a template string — Step 7 will make this LLM-generated. */
  patternSummary: string;
}

export interface PatternMatchInput {
  /** Summary text describing the session or convergence event */
  contextSummary: string;
}

/**
 * Finds related advisory patterns for a given incident context.
 *
 * @param input - Context summary of the session or convergence event
 * @param ragSearch - RAG search function (embedText + searchAdvisories)
 * @returns Related advisories and a template pattern summary
 */
export async function findRelatedPatterns(
  input: PatternMatchInput,
  ragSearch: RagSearchFn
): Promise<PatternMatchResult> {
  const advisories = await ragSearch(input.contextSummary);

  if (advisories.length === 0) {
    return {
      relatedAdvisories: [],
      patternSummary:
        "No matching advisory patterns found in the current corpus.",
    };
  }

  // Template summary — will be replaced with real LLM-generated synthesis
  // in Step 7 via OpenRouter
  const topAdvisory = advisories[0];
  const patternSummary = `Matches pattern seen in "${topAdvisory.sourceTitle}" (${topAdvisory.sourceType}). ` +
    `Relevance score: ${(topAdvisory.score * 100).toFixed(1)}%. ` +
    `${advisories.length > 1 ? `${advisories.length - 1} additional related advisory(ies) found.` : ""}`;

  return {
    relatedAdvisories: advisories,
    patternSummary,
  };
}
