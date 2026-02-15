import {
  requireString,
  requireNonEmptyArray,
  requireArrayOfShape,
  type ValidationResult,
} from './validation.js';

export function validatePlan(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('YAML parsed to null or non-object');
    return { valid: false, errors };
  }

  const d = data as Record<string, unknown>;
  requireString(d, 'content', errors);

  requireArrayOfShape(d, 'phases', errors, (item, idx, errs) => {
    const phase = item as Record<string, unknown>;
    if (!phase || typeof phase !== 'object') {
      errs.push(`phases[${idx}] must be an object`);
      return;
    }
    requireString(phase, 'id', errs, `phases[${idx}].`);
    requireString(phase, 'name', errs, `phases[${idx}].`);
    if (typeof phase.parallel !== 'boolean') {
      errs.push(`phases[${idx}].parallel must be a boolean`);
    }
  });

  const ftc = Array.isArray(d.filesToCreate) ? d.filesToCreate : [];
  const ftm = Array.isArray(d.filesToModify) ? d.filesToModify : [];
  if (ftc.length === 0 && ftm.length === 0) {
    errors.push("At least one of 'filesToCreate' or 'filesToModify' must be non-empty");
  }

  return { valid: errors.length === 0, errors };
}

export function validateTasks(data: unknown, phaseIds: string[]): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('YAML parsed to null or non-object');
    return { valid: false, errors };
  }

  const d = data as Record<string, unknown>;

  requireArrayOfShape(d, 'tasks', errors, (item, idx, errs) => {
    const task = item as Record<string, unknown>;
    if (!task || typeof task !== 'object') {
      errs.push(`tasks[${idx}] must be an object`);
      return;
    }
    requireString(task, 'id', errs, `tasks[${idx}].`);
    requireString(task, 'title', errs, `tasks[${idx}].`);
    requireString(task, 'state', errs, `tasks[${idx}].`);
    requireNonEmptyArray(task, 'acceptanceCriteria', errs, `tasks[${idx}].`);

    if (typeof task.phaseId === 'string' && !phaseIds.includes(task.phaseId)) {
      errs.push(
        `tasks[${idx}].phaseId '${task.phaseId}' does not match any phase (valid: ${phaseIds.join(', ')})`
      );
    } else if (typeof task.phaseId !== 'string') {
      requireString(task, 'phaseId', errs, `tasks[${idx}].`);
    }
  });

  return { valid: errors.length === 0, errors };
}
