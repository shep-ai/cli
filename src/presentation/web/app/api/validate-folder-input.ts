/**
 * Shared input validation for folder API routes.
 *
 * Validates that repositoryPath is a non-empty absolute path without
 * path traversal sequences or null bytes.
 */

interface ValidFolderInput {
  repositoryPath: string;
}
interface ValidationError {
  error: string;
  status: number;
}

export function validateFolderInput(
  body: Record<string, unknown>
): ValidFolderInput | ValidationError {
  const { repositoryPath } = body;

  if (typeof repositoryPath !== 'string' || repositoryPath.length === 0) {
    return { error: 'repositoryPath is required and must be a non-empty string', status: 400 };
  }

  if (!repositoryPath.startsWith('/')) {
    return { error: 'repositoryPath must be an absolute path (starting with /)', status: 400 };
  }

  if (repositoryPath.includes('..')) {
    return { error: 'repositoryPath must not contain path traversal sequences (..)', status: 400 };
  }

  if (repositoryPath.includes('\0')) {
    return { error: 'repositoryPath must not contain null bytes', status: 400 };
  }

  return { repositoryPath };
}
