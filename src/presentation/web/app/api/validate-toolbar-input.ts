/**
 * Shared input validation for feature toolbar API routes.
 *
 * Validates that repositoryPath is a non-empty absolute path and branch is a
 * non-empty string without path traversal sequences or null bytes.
 */

interface ValidInput {
  repositoryPath: string;
  branch: string;
}
interface ValidationError {
  error: string;
  status: number;
}

export function validateToolbarInput(body: Record<string, unknown>): ValidInput | ValidationError {
  const { repositoryPath, branch } = body;

  if (typeof repositoryPath !== 'string' || repositoryPath.length === 0) {
    return { error: 'repositoryPath is required and must be a non-empty string', status: 400 };
  }

  if (!repositoryPath.startsWith('/')) {
    return { error: 'repositoryPath must be an absolute path (starting with /)', status: 400 };
  }

  if (typeof branch !== 'string' || branch.length === 0) {
    return { error: 'branch is required and must be a non-empty string', status: 400 };
  }

  if (branch.includes('..')) {
    return { error: 'branch must not contain path traversal sequences (..)', status: 400 };
  }

  if (branch.includes('\0')) {
    return { error: 'branch must not contain null bytes', status: 400 };
  }

  return { repositoryPath, branch };
}
