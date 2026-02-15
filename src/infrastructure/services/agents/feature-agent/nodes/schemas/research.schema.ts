import {
  requireString,
  requireArrayOfShape,
  requireNonEmptyArray,
  type ValidationResult,
} from './validation.js';

export function validateResearch(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('YAML parsed to null or non-object');
    return { valid: false, errors };
  }

  const d = data as Record<string, unknown>;
  requireString(d, 'name', errors);
  requireString(d, 'summary', errors);
  requireString(d, 'content', errors);

  requireArrayOfShape(d, 'decisions', errors, (item, idx, errs) => {
    const decision = item as Record<string, unknown>;
    if (!decision || typeof decision !== 'object') {
      errs.push(`decisions[${idx}] must be an object`);
      return;
    }
    requireString(decision, 'title', errs, `decisions[${idx}].`);
    requireString(decision, 'chosen', errs, `decisions[${idx}].`);
    requireNonEmptyArray(decision, 'rejected', errs, `decisions[${idx}].`);
    requireString(decision, 'rationale', errs, `decisions[${idx}].`);
  });

  return { valid: errors.length === 0, errors };
}
