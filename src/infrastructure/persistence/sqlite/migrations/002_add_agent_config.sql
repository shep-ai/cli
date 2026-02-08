-- =============================================================================
-- Migration 002: Add Agent Configuration
-- =============================================================================
-- Adds agent configuration columns to the settings table.
-- Extends the singleton Settings entity with agent selection and auth config.
--
-- New Columns:
-- - agent_type: Which AI coding tool to use (default: claude-code)
-- - agent_auth_method: How to authenticate with the agent (default: session)
-- - agent_token: API token for token-based auth (nullable)
--
-- Design Notes:
-- - Follows flat-column pattern consistent with existing settings columns
-- - Uses ALTER TABLE ADD COLUMN (safe for SQLite, no data loss)
-- - DEFAULT values ensure existing rows gain sensible defaults
-- - agent_token is nullable (only used when agent_auth_method = 'token')

ALTER TABLE settings ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'claude-code';
ALTER TABLE settings ADD COLUMN agent_auth_method TEXT NOT NULL DEFAULT 'session';
ALTER TABLE settings ADD COLUMN agent_token TEXT;
