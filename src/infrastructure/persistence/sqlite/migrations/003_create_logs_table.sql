/**
 * Migration 003: Create Logs Table
 *
 * Creates the main logs table for storing log entries with full-text search support.
 *
 * Tables:
 * - logs: Main table for log entries
 * - logs_fts: FTS5 virtual table for full-text search
 *
 * Triggers:
 * - logs_ai: Auto-insert into FTS5 on INSERT
 * - logs_au: Auto-update FTS5 on UPDATE
 * - logs_ad: Auto-delete from FTS5 on DELETE
 *
 * Indexes:
 * - idx_logs_timestamp: For time-based queries (DESC for recent-first)
 * - idx_logs_level: For filtering by log level
 * - idx_logs_source: For filtering by log source
 */

-- Create main logs table
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp INTEGER NOT NULL,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  stack_trace TEXT,
  created_at TEXT NOT NULL
);

-- Create FTS5 virtual table for full-text search
-- Using contentless table (no content= parameter) for manual sync control
CREATE VIRTUAL TABLE IF NOT EXISTS logs_fts USING fts5(
  id UNINDEXED,
  message
);

-- Trigger: Sync FTS5 on INSERT
CREATE TRIGGER IF NOT EXISTS logs_ai AFTER INSERT ON logs BEGIN
  INSERT INTO logs_fts(id, message)
  VALUES (new.id, new.message);
END;

-- Trigger: Sync FTS5 on UPDATE
CREATE TRIGGER IF NOT EXISTS logs_au AFTER UPDATE ON logs BEGIN
  UPDATE logs_fts SET message = new.message WHERE id = old.id;
END;

-- Trigger: Sync FTS5 on DELETE
CREATE TRIGGER IF NOT EXISTS logs_ad AFTER DELETE ON logs BEGIN
  DELETE FROM logs_fts WHERE id = old.id;
END;

-- Create index on timestamp (DESC for recent-first queries)
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);

-- Create index on level (for filtering by severity)
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);

-- Create index on source (for filtering by log source)
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
