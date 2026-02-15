/**
 * Settings Database Mapper
 *
 * Maps between Settings domain objects and SQLite database rows.
 *
 * Mapping Rules:
 * - TypeScript objects (camelCase) ↔ SQL columns (snake_case)
 * - Nested objects flattened to columns (e.g., models.analyze → model_analyze)
 * - Booleans stored as INTEGER (0 = false, 1 = true)
 * - Dates stored as ISO 8601 strings
 * - Optional fields stored as NULL when missing
 */

import type { Settings } from '../../../../domain/generated/output.js';
import {
  type AgentType,
  type AgentAuthMethod,
  type EditorType,
} from '../../../../domain/generated/output.js';

/**
 * Database row type matching the settings table schema.
 * Uses snake_case column names with flattened nested objects.
 */
export interface SettingsRow {
  // Base entity
  id: string;
  created_at: string;
  updated_at: string;

  // ModelConfiguration (models.*)
  model_analyze: string;
  model_requirements: string;
  model_plan: string;
  model_implement: string;

  // UserProfile (user.*) - all nullable
  user_name: string | null;
  user_email: string | null;
  user_github_username: string | null;

  // EnvironmentConfig (environment.*)
  env_default_editor: string;
  env_shell_preference: string;

  // SystemConfig (system.*)
  sys_auto_update: number; // Boolean stored as INTEGER
  sys_log_level: string;

  // AgentConfig (agent.*)
  agent_type: string;
  agent_auth_method: string;
  agent_token: string | null;
}

/**
 * Maps Settings domain object to database row.
 * Flattens nested objects and converts types for SQL storage.
 *
 * @param settings - Settings domain object
 * @returns Database row object with snake_case columns
 */
export function toDatabase(settings: Settings): SettingsRow {
  return {
    // Base entity
    id: settings.id,
    created_at:
      settings.createdAt instanceof Date ? settings.createdAt.toISOString() : settings.createdAt,
    updated_at:
      settings.updatedAt instanceof Date ? settings.updatedAt.toISOString() : settings.updatedAt,

    // ModelConfiguration
    model_analyze: settings.models.analyze,
    model_requirements: settings.models.requirements,
    model_plan: settings.models.plan,
    model_implement: settings.models.implement,

    // UserProfile (optional fields → NULL)
    user_name: settings.user.name ?? null,
    user_email: settings.user.email ?? null,
    user_github_username: settings.user.githubUsername ?? null,

    // EnvironmentConfig
    env_default_editor: settings.environment.defaultEditor,
    env_shell_preference: settings.environment.shellPreference,

    // SystemConfig
    sys_auto_update: settings.system.autoUpdate ? 1 : 0,
    sys_log_level: settings.system.logLevel,

    // AgentConfig (optional token → NULL)
    agent_type: settings.agent.type,
    agent_auth_method: settings.agent.authMethod,
    agent_token: settings.agent.token ?? null,
  };
}

/**
 * Maps database row to Settings domain object.
 * Reconstructs nested objects and converts types from SQL.
 *
 * @param row - Database row with snake_case columns
 * @returns Settings domain object with camelCase properties
 */
export function fromDatabase(row: SettingsRow): Settings {
  return {
    // Base entity
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),

    // ModelConfiguration
    models: {
      analyze: row.model_analyze,
      requirements: row.model_requirements,
      plan: row.model_plan,
      implement: row.model_implement,
    },

    // UserProfile (NULL → undefined, exclude from object)
    user: {
      ...(row.user_name !== null && { name: row.user_name }),
      ...(row.user_email !== null && { email: row.user_email }),
      ...(row.user_github_username !== null && { githubUsername: row.user_github_username }),
    },

    // EnvironmentConfig
    environment: {
      defaultEditor: row.env_default_editor as EditorType,
      shellPreference: row.env_shell_preference,
    },

    // SystemConfig (INTEGER → boolean)
    system: {
      autoUpdate: row.sys_auto_update === 1,
      logLevel: row.sys_log_level,
    },

    // AgentConfig (NULL → undefined for optional token)
    agent: {
      type: row.agent_type as AgentType,
      authMethod: row.agent_auth_method as AgentAuthMethod,
      ...(row.agent_token !== null && { token: row.agent_token }),
    },
  };
}
