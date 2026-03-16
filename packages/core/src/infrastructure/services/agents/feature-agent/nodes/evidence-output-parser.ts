/**
 * Evidence Output Parser
 *
 * Extracts structured Evidence records from free-form agent text output.
 * Looks for a fenced JSON code block containing an array of evidence objects.
 * Returns empty array gracefully on any parsing failure.
 *
 * Also provides validation to ensure UI-related evidence includes app-level
 * proof (not just Storybook screenshots).
 */

import type { Evidence } from '../../../../../domain/generated/output.js';
import { EvidenceType } from '../../../../../domain/generated/output.js';

// Matches a fenced JSON code block: ```json ... ```
const JSON_BLOCK_RE = /```json\s*\n([\s\S]*?)\n\s*```/;

const VALID_EVIDENCE_TYPES = new Set<string>(Object.values(EvidenceType));

function isValidRecord(record: unknown): record is Evidence {
  if (record === null || typeof record !== 'object') return false;

  const r = record as Record<string, unknown>;

  if (typeof r.type !== 'string' || !VALID_EVIDENCE_TYPES.has(r.type)) return false;
  if (typeof r.capturedAt !== 'string') return false;
  if (typeof r.description !== 'string') return false;
  if (typeof r.relativePath !== 'string') return false;

  // Block path traversal
  if (r.relativePath.includes('..')) return false;

  return true;
}

/**
 * Extract Evidence records from agent text output.
 * Looks for a fenced JSON code block containing a JSON array of evidence objects.
 * Returns empty array when no block found, JSON is malformed, or no valid records exist.
 */
export function parseEvidenceRecords(output: string): Evidence[] {
  const match = output.match(JSON_BLOCK_RE);
  if (!match) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isValidRecord);
}

/**
 * Patterns that indicate a screenshot is from Storybook rather than the actual app.
 * Checked case-insensitively against description and relativePath.
 */
const STORYBOOK_PATTERNS = [/storybook/i, /story\b/i, /stories/i, /\b6006\b/];

/**
 * Patterns that indicate a screenshot is from the actual running application.
 * Checked case-insensitively against description and relativePath.
 */
const APP_PROOF_PATTERNS = [/\bapp[:\-\s]/i, /dev\s*server/i, /running\s*app/i, /actual\s*app/i];

function isScreenshot(e: Evidence): boolean {
  return e.type === EvidenceType.Screenshot || e.type === EvidenceType.Video;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function isStorybookEvidence(e: Evidence): boolean {
  return (
    matchesAny(e.description, STORYBOOK_PATTERNS) || matchesAny(e.relativePath, STORYBOOK_PATTERNS)
  );
}

function isAppEvidence(e: Evidence): boolean {
  // Explicitly marked as app-level evidence
  if (
    matchesAny(e.description, APP_PROOF_PATTERNS) ||
    matchesAny(e.relativePath, APP_PROOF_PATTERNS)
  ) {
    return true;
  }
  // A screenshot that is NOT storybook is treated as app-level evidence
  return !isStorybookEvidence(e);
}

export interface UiEvidenceValidationResult {
  valid: boolean;
  hasScreenshots: boolean;
  hasAppScreenshots: boolean;
  hasOnlyStorybookScreenshots: boolean;
  warnings: string[];
}

/**
 * Validate that UI-related evidence includes app-level proof, not just Storybook screenshots.
 *
 * Returns a validation result indicating whether the evidence set meets the requirement
 * for app-level proof. Screenshots/videos are considered "Storybook-only" if their
 * description or path contains storybook-related keywords and NO screenshots have
 * app-level indicators.
 *
 * This validation is informational — it produces warnings but does not filter out records.
 */
export function validateUiEvidenceHasAppProof(evidence: Evidence[]): UiEvidenceValidationResult {
  const screenshots = evidence.filter(isScreenshot);
  const warnings: string[] = [];

  if (screenshots.length === 0) {
    return {
      valid: true,
      hasScreenshots: false,
      hasAppScreenshots: false,
      hasOnlyStorybookScreenshots: false,
      warnings,
    };
  }

  const appScreenshots = screenshots.filter(isAppEvidence);
  const storybookScreenshots = screenshots.filter(isStorybookEvidence);
  const hasOnlyStorybook = storybookScreenshots.length > 0 && appScreenshots.length === 0;

  if (hasOnlyStorybook) {
    warnings.push(
      'UI evidence contains only Storybook screenshots. App-level screenshots from the running application are REQUIRED for UI features.'
    );
  }

  if (screenshots.length > 0 && appScreenshots.length === 0 && storybookScreenshots.length === 0) {
    // Screenshots exist but none clearly identified as app or storybook — warn to be explicit
    warnings.push(
      'UI screenshots lack clear app-level indicators. Include "app" in the description or filename to confirm they are from the actual running application.'
    );
  }

  return {
    valid: !hasOnlyStorybook,
    hasScreenshots: screenshots.length > 0,
    hasAppScreenshots: appScreenshots.length > 0,
    hasOnlyStorybookScreenshots: hasOnlyStorybook,
    warnings,
  };
}
