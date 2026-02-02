#!/usr/bin/env node

/**
 * Shep AI CLI Entry Point
 *
 * Autonomous AI Native SDLC Platform - CLI Interface
 *
 * Usage:
 *   shep [command] [options]
 *
 * Commands:
 *   shep           Show help
 *   shep version   Display version information
 *   shep --version Display version number only
 *
 * Global Options:
 *   -v, --version  Display version number
 *   -h, --help     Display help
 */

import { Command } from 'commander';
import { VersionService } from '../../infrastructure/services/version.service.js';
import { createVersionCommand } from './commands/version.command.js';
import { messages } from './ui/index.js';

// Initialize version service
const versionService = new VersionService();
const { version, description } = versionService.getVersion();

// Create main program
const program = new Command()
  .name('shep')
  .description(description)
  .version(version, '-v, --version', 'Display version number')
  .action(() => {
    // Default action when no subcommand is provided - show help
    program.outputHelp();
  });

// Register commands
program.addCommand(createVersionCommand());

// Global error handler
process.on('uncaughtException', (error) => {
  messages.error('An unexpected error occurred', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  messages.error('Unhandled promise rejection', error);
  process.exit(1);
});

// Parse arguments
program.parse();
