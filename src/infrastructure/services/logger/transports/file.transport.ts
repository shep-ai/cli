/**
 * @module Infrastructure.Services.Logger.Transports.File
 *
 * File transport for pino logger with rotation.
 *
 * Uses pino-roll for automatic log rotation with:
 * - Daily rotation at midnight
 * - Size-based rotation at 100MB
 * - 30 day retention policy
 * - Symlink to current active log file
 *
 * ## Log Files
 *
 * Logs are written to: `~/.shep/logs/shep.YYYY-MM-DD.log`
 * Current log symlinked at: `~/.shep/logs/current.log`
 *
 * ## Rotation Rules
 *
 * Files rotate when:
 * - Daily at midnight (00:00:00)
 * - File size exceeds 100MB
 *
 * Old logs are kept for 30 days, then automatically deleted.
 *
 * ## Usage
 *
 * ```typescript
 * import { createFileTransport } from './file.transport';
 * import pino from 'pino';
 *
 * const transport = createFileTransport('~/.shep/logs');
 * const logger = pino({ level: 'info' }, transport);
 * ```
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * Pino transport configuration.
 */
export interface PinoTransport {
  /**
   * Transport target module name.
   */
  target: string;

  /**
   * Transport-specific options.
   */
  options: Record<string, unknown>;
}

/**
 * Creates file transport with rotation using pino-roll.
 *
 * Features:
 * - Daily rotation at midnight
 * - Size-based rotation at 100MB
 * - 30 day retention (old logs auto-deleted)
 * - Symlink to current.log for easy access
 * - Directory created with 0700 permissions
 *
 * @param logDir - Directory to store log files (supports ~ expansion)
 * @returns Pino transport configuration for file logging
 *
 * @example
 * ```typescript
 * // Use default Shep log directory
 * const transport = createFileTransport('~/.shep/logs');
 *
 * // Use custom directory
 * const transport = createFileTransport('/var/log/shep');
 * ```
 */
export function createFileTransport(logDir: string): PinoTransport {
  // Expand tilde to home directory
  const expandedDir = expandHomePath(logDir);

  // Ensure log directory exists with secure permissions
  ensureLogDirectory(expandedDir);

  // Generate file path with date pattern
  const today = new Date();
  const dateStr = formatDate(today);
  const logFilePath = path.join(expandedDir, `shep.${dateStr}.log`);
  const symlinkPath = path.join(expandedDir, 'current.log');

  return {
    target: 'pino-roll',
    options: {
      // Log file path with date
      file: logFilePath,

      // Symlink to current log file
      link: symlinkPath,

      // Rotation frequency (daily at midnight)
      frequency: 'daily',

      // Size limit before rotation (100MB)
      size: '100m',

      // Retention period in days
      retention: 30,

      // File extension for rotated files
      extension: '.log',

      // Sync writes (no buffering)
      sync: true,
    },
  };
}

/**
 * Expands ~ to home directory path.
 *
 * @param filePath - Path potentially containing ~
 * @returns Expanded absolute path
 *
 * @example
 * ```typescript
 * expandHomePath('~/.shep/logs')
 * // => '/home/user/.shep/logs'
 * ```
 */
function expandHomePath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return path.resolve(filePath);
}

/**
 * Ensures log directory exists with secure permissions.
 *
 * Creates directory if needed with permissions 0700 (owner read/write/execute only).
 *
 * @param dirPath - Absolute path to log directory
 */
function ensureLogDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    // Create directory with owner-only permissions (0700)
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  } else {
    // Ensure existing directory has correct permissions
    fs.chmodSync(dirPath, 0o700);
  }
}

/**
 * Formats date as YYYY-MM-DD for log file names.
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * ```typescript
 * formatDate(new Date('2026-02-08'))
 * // => '2026-02-08'
 * ```
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
