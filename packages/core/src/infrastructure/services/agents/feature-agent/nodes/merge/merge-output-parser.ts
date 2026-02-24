/**
 * Merge Output Parser
 *
 * Extracts structured data (commit SHA, PR URL/number) from agent text output
 * using regex patterns. Falls back gracefully to null when patterns don't match.
 */

// Matches git commit output: [branch SHA] message
// Also matches "Created commit SHA" or "commit SHA" patterns
const COMMIT_SHA_RE = /\[[\w/.-]+\s+([0-9a-f]{7,40})\]|(?:commit\s+)([0-9a-f]{7,40})/i;

// Matches GitHub PR URL: https://github.com/owner/repo/pull/123
const PR_URL_RE = /(https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+))/;

export interface PrParseResult {
  url: string;
  number: number;
}

/**
 * Extract the first commit SHA from agent output text.
 * Looks for git commit output format `[branch SHA]` or `commit SHA`.
 * Returns null if no SHA found.
 */
export function parseCommitHash(output: string): string | null {
  const match = output.match(COMMIT_SHA_RE);
  if (!match) return null;
  return match[1] ?? match[2] ?? null;
}

/**
 * Extract the first GitHub PR URL and number from agent output text.
 * Returns null if no PR URL found.
 */
export function parsePrUrl(output: string): PrParseResult | null {
  const match = output.match(PR_URL_RE);
  if (!match) return null;
  return { url: match[1], number: parseInt(match[2], 10) };
}
