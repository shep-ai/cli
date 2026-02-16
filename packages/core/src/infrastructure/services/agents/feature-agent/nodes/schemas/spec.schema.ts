import { requireString, requireNonEmptyArray, type ValidationResult } from './validation.js';

const VALID_SIZE_ESTIMATES = ['S', 'M', 'L', 'XL'];

function validateBaseSpec(data: unknown, errors: string[]): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    errors.push('YAML parsed to null or non-object');
    return false;
  }
  const d = data as Record<string, unknown>;
  requireString(d, 'name', errors);
  requireString(d, 'oneLiner', errors);
  requireString(d, 'summary', errors);
  requireString(d, 'phase', errors);
  requireString(d, 'content', errors);
  requireNonEmptyArray(d, 'technologies', errors);

  if (typeof d.sizeEstimate === 'string' && !VALID_SIZE_ESTIMATES.includes(d.sizeEstimate)) {
    errors.push(
      `Field 'sizeEstimate' must be one of ${VALID_SIZE_ESTIMATES.join(', ')}, got '${d.sizeEstimate}'`
    );
  } else if (typeof d.sizeEstimate !== 'string') {
    requireString(d, 'sizeEstimate', errors);
  }

  return true;
}

export function validateSpecAnalyze(data: unknown): ValidationResult {
  const errors: string[] = [];
  validateBaseSpec(data, errors);
  return { valid: errors.length === 0, errors };
}

export function validateSpecRequirements(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!validateBaseSpec(data, errors)) return { valid: false, errors };

  const d = data as Record<string, unknown>;
  if (!('openQuestions' in d)) {
    errors.push("Missing required field 'openQuestions'");
  } else if (Array.isArray(d.openQuestions)) {
    for (let i = 0; i < d.openQuestions.length; i++) {
      const q = d.openQuestions[i] as Record<string, unknown>;
      if (!q || typeof q !== 'object') {
        errors.push(`openQuestions[${i}] must be an object`);
        continue;
      }
      requireString(q, 'question', errors, `openQuestions[${i}].`);
    }
  } else {
    errors.push("Field 'openQuestions' must be an array");
  }

  return { valid: errors.length === 0, errors };
}
