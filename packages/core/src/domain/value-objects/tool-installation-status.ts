/**
 * ToolInstallationStatus Value Object
 *
 * Represents the installation status of a development tool with optional
 * error messages and installation suggestions. Provides immutable, validated
 * value objects through factory functions.
 *
 * Uses Object.freeze() to ensure immutability and prevent accidental mutations.
 */

import type {
  ToolInstallationStatus as GeneratedType,
  InstallationSuggestion,
} from '@/domain/generated/output.js';

/**
 * Type alias for the generated ToolInstallationStatus type
 */
export type ToolInstallationStatus = GeneratedType;

/**
 * Valid status values for tool installation
 */
const VALID_STATUSES = ['available', 'missing', 'error'] as const;

/**
 * Creates a validated, immutable ToolInstallationStatus value object.
 *
 * @param data - The status data to create
 * @returns A frozen ToolInstallationStatus object
 * @throws {Error} If toolName is empty or status is invalid
 *
 * @example
 * const status = createToolInstallationStatus({
 *   status: 'available',
 *   toolName: 'vscode',
 * });
 */
export function createToolInstallationStatus(data: ToolInstallationStatus): ToolInstallationStatus {
  // Validate and normalize toolName
  const toolName = (data.toolName ?? '').trim();
  if (!toolName) {
    throw new Error('toolName must be a non-empty string');
  }

  // Validate status
  const status_value = data.status as string;
  if (!VALID_STATUSES.includes(status_value as (typeof VALID_STATUSES)[number])) {
    throw new Error(`status must be one of: ${VALID_STATUSES.join(', ')}. Got: ${data.status}`);
  }

  // Create the object with normalized toolName
  const status: ToolInstallationStatus = {
    status: data.status,
    toolName,
    ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
    ...(data.suggestions !== undefined && {
      suggestions: data.suggestions,
    }),
  };

  // Freeze suggestions array if present
  if (status.suggestions) {
    Object.freeze(status.suggestions);
  }

  // Freeze and return the object
  return Object.freeze(status);
}

/**
 * Creates an available tool status object.
 *
 * @param toolName - The name of the available tool
 * @returns A frozen ToolInstallationStatus with status='available'
 * @throws {Error} If toolName is empty
 *
 * @example
 * const status = createAvailableStatus('vscode');
 */
export function createAvailableStatus(toolName: string): ToolInstallationStatus {
  return createToolInstallationStatus({
    status: 'available',
    toolName,
  });
}

/**
 * Creates a missing tool status object with installation suggestions.
 *
 * @param toolName - The name of the missing tool
 * @param suggestions - Installation suggestions for the tool
 * @returns A frozen ToolInstallationStatus with status='missing'
 * @throws {Error} If toolName is empty
 *
 * @example
 * const status = createMissingStatus('vscode', [
 *   {
 *     packageManager: 'brew',
 *     command: 'brew install code',
 *     documentationUrl: 'https://code.visualstudio.com/docs/setup/mac',
 *   }
 * ]);
 */
export function createMissingStatus(
  toolName: string,
  suggestions: InstallationSuggestion[]
): ToolInstallationStatus {
  return createToolInstallationStatus({
    status: 'missing',
    toolName,
    suggestions,
  });
}

/**
 * Creates an error tool status object with error details.
 *
 * @param toolName - The name of the tool with an error
 * @param errorMessage - Description of what went wrong
 * @returns A frozen ToolInstallationStatus with status='error'
 * @throws {Error} If toolName is empty
 *
 * @example
 * const status = createErrorStatus('vscode', 'Permission denied');
 */
export function createErrorStatus(toolName: string, errorMessage: string): ToolInstallationStatus {
  return createToolInstallationStatus({
    status: 'error',
    toolName,
    errorMessage,
  });
}
