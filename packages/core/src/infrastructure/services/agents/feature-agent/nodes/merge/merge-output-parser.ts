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

export interface CiWatchParseResult {
  status: 'success' | 'failure';
  summary?: string;
  runUrl?: string;
}

// Matches CI_STATUS: PASSED or CI_STATUS: FAILED — <summary>
const CI_STATUS_PASSED_RE = /CI_STATUS:\s*PASSED/;
const CI_STATUS_FAILED_RE = /CI_STATUS:\s*FAILED(?:\s*—\s*(.+))?/;

// Matches GitHub Actions run URL
const RUN_URL_RE = /(https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+)/;

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

/**
 * Extract CI watch result from agent output text.
 * Looks for CI_STATUS: PASSED or CI_STATUS: FAILED markers.
 * When multiple CI_STATUS markers appear, uses the last one.
 * Returns failure with diagnostic summary if no marker found.
 */
export function parseCiWatchResult(output: string): CiWatchParseResult {
  const runUrlMatch = output.match(RUN_URL_RE);
  const runUrl = runUrlMatch ? runUrlMatch[1] : undefined;

  // Split into lines and check from bottom up (last status wins)
  const lines = output.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (CI_STATUS_PASSED_RE.test(line)) {
      return { status: 'success', runUrl };
    }
    const failedMatch = line.match(CI_STATUS_FAILED_RE);
    if (failedMatch) {
      const summary = failedMatch[1]?.trim() || 'CI failed (no details provided)';
      return { status: 'failure', summary, runUrl };
    }
  }

  return {
    status: 'failure',
    summary: 'CI status could not be determined from agent output',
    runUrl,
  };
}
