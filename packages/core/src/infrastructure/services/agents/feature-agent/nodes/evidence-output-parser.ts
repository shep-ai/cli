/**
 * Evidence Output Parser
 *
 * Extracts structured Evidence records from free-form agent text output.
 * Looks for a fenced JSON code block containing an array of evidence objects.
 * Returns empty array gracefully on any parsing failure.
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
