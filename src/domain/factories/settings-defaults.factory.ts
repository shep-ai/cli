/**
 * Settings Defaults Factory
 *
 * Factory function for creating Settings entities with sensible defaults
 * matching the TypeSpec model specification.
 *
 * This factory ensures:
 * - All model agents default to claude-sonnet-4-5
 * - User profile fields are optional (empty object)
 * - Editor defaults to vscode, shell to bash
 * - Auto-update enabled, log level set to info
 * - Unique IDs and timestamps generated for each instance
 */

import { randomUUID } from 'node:crypto';
import type {
  Settings,
  ModelConfiguration,
  UserProfile,
  EnvironmentConfig,
  SystemConfig,
  AgentConfig,
} from '../generated/output.js';
import { AgentType, AgentAuthMethod, EditorType } from '../generated/output.js';

/**
 * Default AI model for all SDLC agents.
 * Provides balanced performance and cost for all workflow stages.
 */
const DEFAULT_MODEL = 'claude-sonnet-4-5' as const;

/**
 * Default code editor preference.
 * Most widely used editor in the development community.
 */
const DEFAULT_EDITOR = EditorType.VsCode;

/**
 * Default shell preference.
 * Most common shell across Unix-like systems.
 */
const DEFAULT_SHELL = 'bash' as const;

/**
 * Default log level for CLI output.
 * Provides informational messages without overwhelming verbosity.
 */
const DEFAULT_LOG_LEVEL = 'info' as const;

/**
 * Default AI coding agent.
 * Claude Code is the only currently supported agent.
 */
const DEFAULT_AGENT_TYPE = AgentType.ClaudeCode;

/**
 * Default agent authentication method.
 * Session auth uses the agent's built-in authentication.
 */
const DEFAULT_AUTH_METHOD = AgentAuthMethod.Session;

/**
 * Creates a Settings entity with sensible defaults.
 *
 * Default values match the TypeSpec model specification:
 * - All AI models: claude-sonnet-4-5
 * - Editor: vscode
 * - Shell: bash
 * - Auto-update: enabled
 * - Log level: info
 * - User profile: empty (all fields optional)
 * - Agent: Claude Code with session auth
 *
 * @returns Settings entity with default values
 *
 * @example
 * ```typescript
 * const settings = createDefaultSettings();
 * console.log(settings.models.analyze); // "claude-sonnet-4-5"
 * console.log(settings.environment.defaultEditor); // "vscode"
 * ```
 */
export function createDefaultSettings(): Settings {
  const now = new Date();

  const models: ModelConfiguration = {
    analyze: DEFAULT_MODEL,
    requirements: DEFAULT_MODEL,
    plan: DEFAULT_MODEL,
    implement: DEFAULT_MODEL,
  };

  const user: UserProfile = {};

  const environment: EnvironmentConfig = {
    defaultEditor: DEFAULT_EDITOR,
    shellPreference: DEFAULT_SHELL,
  };

  const system: SystemConfig = {
    autoUpdate: true,
    logLevel: DEFAULT_LOG_LEVEL,
  };

  const agent: AgentConfig = {
    type: DEFAULT_AGENT_TYPE,
    authMethod: DEFAULT_AUTH_METHOD,
  };

  return {
    id: randomUUID(),
    models,
    user,
    environment,
    system,
    agent,
    createdAt: now,
    updatedAt: now,
  };
}
