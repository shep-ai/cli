-- =============================================================================
-- Migration 001: Create Settings Table
-- =============================================================================
-- Creates the settings table for storing global configuration.
-- Implements singleton pattern (only one row allowed via PRIMARY KEY).
--
-- Schema Design:
-- - Flattens nested Settings object into columns
-- - Uses snake_case for SQL columns (TypeScript uses camelCase)
-- - TEXT for UUIDs and strings
-- - INTEGER for booleans (0 = false, 1 = true)
-- - TEXT for timestamps (ISO 8601 format)
--
-- Singleton Pattern:
-- - id is PRIMARY KEY (only one value can exist)
-- - Application always uses same id ('singleton')

CREATE TABLE IF NOT EXISTS settings (
  -- Base entity fields
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  -- ModelConfiguration fields
  model_analyze TEXT NOT NULL,
  model_requirements TEXT NOT NULL,
  model_plan TEXT NOT NULL,
  model_implement TEXT NOT NULL,

  -- UserProfile fields (all optional)
  user_name TEXT,
  user_email TEXT,
  user_github_username TEXT,

  -- EnvironmentConfig fields
  env_default_editor TEXT NOT NULL,
  env_shell_preference TEXT NOT NULL,

  -- SystemConfig fields
  sys_auto_update INTEGER NOT NULL,
  sys_log_level TEXT NOT NULL
);

-- Index for efficient singleton queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_id ON settings(id);
