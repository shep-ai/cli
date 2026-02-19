/**
 * SQLite Settings Repository Implementation
 *
 * Implements ISettingsRepository using SQLite database.
 * Enforces singleton pattern (only one Settings record allowed).
 * Uses prepared statements to prevent SQL injection.
 */

import type Database from 'better-sqlite3';
import { injectable } from 'tsyringe';
import type { ISettingsRepository } from '../../application/ports/output/repositories/settings.repository.interface.js';
import type { Settings } from '../../domain/generated/output.js';
import {
  toDatabase,
  fromDatabase,
  type SettingsRow,
} from '../persistence/sqlite/mappers/settings.mapper.js';

/**
 * SQLite implementation of ISettingsRepository.
 * Manages Settings persistence with singleton constraint.
 */
@injectable()
export class SQLiteSettingsRepository implements ISettingsRepository {
  constructor(private readonly db: Database.Database) {}

  /**
   * Initialize settings for the first time.
   * Creates a new Settings record in the database.
   *
   * @param settings - The settings to initialize with
   * @throws Error if settings already exist (singleton constraint)
   */
  async initialize(settings: Settings): Promise<void> {
    // Check if settings already exist (singleton constraint)
    const existing = await this.load();
    if (existing !== null) {
      throw new Error('Settings already exist. Use update() to modify existing settings.');
    }

    // Convert to database format
    const row = toDatabase(settings);

    // Prepare INSERT statement
    const stmt = this.db.prepare(`
      INSERT INTO settings (
        id, created_at, updated_at,
        model_analyze, model_requirements, model_plan, model_implement,
        user_name, user_email, user_github_username,
        env_default_editor, env_shell_preference,
        sys_auto_update, sys_log_level,
        agent_type, agent_auth_method, agent_token,
        notif_in_app_enabled, notif_browser_enabled, notif_desktop_enabled,
        notif_evt_agent_started, notif_evt_phase_completed, notif_evt_waiting_approval,
        notif_evt_agent_completed, notif_evt_agent_failed,
        workflow_open_pr_on_impl_complete, workflow_auto_merge_on_impl_complete
      ) VALUES (
        @id, @created_at, @updated_at,
        @model_analyze, @model_requirements, @model_plan, @model_implement,
        @user_name, @user_email, @user_github_username,
        @env_default_editor, @env_shell_preference,
        @sys_auto_update, @sys_log_level,
        @agent_type, @agent_auth_method, @agent_token,
        @notif_in_app_enabled, @notif_browser_enabled, @notif_desktop_enabled,
        @notif_evt_agent_started, @notif_evt_phase_completed, @notif_evt_waiting_approval,
        @notif_evt_agent_completed, @notif_evt_agent_failed,
        @workflow_open_pr_on_impl_complete, @workflow_auto_merge_on_impl_complete
      )
    `);

    // Execute with named parameters (safe from SQL injection)
    stmt.run(row);
  }

  /**
   * Load existing settings from the database.
   *
   * @returns The existing Settings or null if not initialized
   */
  async load(): Promise<Settings | null> {
    // Query the singleton row (table enforces at most one row)
    const stmt = this.db.prepare('SELECT * FROM settings LIMIT 1');

    // Execute query
    const row = stmt.get() as SettingsRow | undefined;

    // Return null if not found
    if (!row) {
      return null;
    }

    // Convert from database format
    return fromDatabase(row);
  }

  /**
   * Update existing settings in the database.
   *
   * @param settings - The updated settings to persist
   * @throws Error if settings don't exist (must initialize first)
   */
  async update(settings: Settings): Promise<void> {
    // Check if settings exist
    const existing = await this.load();
    if (existing === null) {
      throw new Error('Settings do not exist. Use initialize() first.');
    }

    // Convert to database format
    const row = toDatabase(settings);

    // Prepare UPDATE statement
    const stmt = this.db.prepare(`
      UPDATE settings SET
        created_at = @created_at,
        updated_at = @updated_at,
        model_analyze = @model_analyze,
        model_requirements = @model_requirements,
        model_plan = @model_plan,
        model_implement = @model_implement,
        user_name = @user_name,
        user_email = @user_email,
        user_github_username = @user_github_username,
        env_default_editor = @env_default_editor,
        env_shell_preference = @env_shell_preference,
        sys_auto_update = @sys_auto_update,
        sys_log_level = @sys_log_level,
        agent_type = @agent_type,
        agent_auth_method = @agent_auth_method,
        agent_token = @agent_token,
        notif_in_app_enabled = @notif_in_app_enabled,
        notif_browser_enabled = @notif_browser_enabled,
        notif_desktop_enabled = @notif_desktop_enabled,
        notif_evt_agent_started = @notif_evt_agent_started,
        notif_evt_phase_completed = @notif_evt_phase_completed,
        notif_evt_waiting_approval = @notif_evt_waiting_approval,
        notif_evt_agent_completed = @notif_evt_agent_completed,
        notif_evt_agent_failed = @notif_evt_agent_failed,
        workflow_open_pr_on_impl_complete = @workflow_open_pr_on_impl_complete,
        workflow_auto_merge_on_impl_complete = @workflow_auto_merge_on_impl_complete
      WHERE id = @id
    `);

    // Execute with named parameters (safe from SQL injection)
    const result = stmt.run(row);

    // Verify update succeeded
    if (result.changes === 0) {
      throw new Error('Failed to update settings: no rows affected');
    }
  }
}
