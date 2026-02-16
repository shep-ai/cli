export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function requireString(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
  prefix = ''
): void {
  const val = data[field];
  if (val === undefined || val === null) {
    errors.push(`Missing required string field '${prefix}${field}'`);
  } else if (typeof val !== 'string') {
    errors.push(`Field '${prefix}${field}' must be a string, got ${typeof val}`);
  } else if (val.trim() === '') {
    errors.push(`Field '${prefix}${field}' must not be empty`);
  }
}

export function requireNonEmptyArray(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
  prefix = ''
): unknown[] | null {
  const val = data[field];
  if (val === undefined || val === null) {
    errors.push(`Missing required array field '${prefix}${field}'`);
    return null;
  }
  if (!Array.isArray(val)) {
    errors.push(`Field '${prefix}${field}' must be an array, got ${typeof val}`);
    return null;
  }
  if (val.length === 0) {
    errors.push(`Field '${prefix}${field}' must not be empty`);
    return null;
  }
  return val;
}

export function requireArrayOfShape(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
  itemChecker: (item: unknown, index: number, errors: string[]) => void,
  prefix = ''
): void {
  const arr = requireNonEmptyArray(data, field, errors, prefix);
  if (!arr) return;
  for (let i = 0; i < arr.length; i++) {
    itemChecker(arr[i], i, errors);
  }
}
