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
 *   shep              Show help
 *   shep version      Display version information
 *   shep ui           Start the web UI
 *   shep run          Run an AI agent workflow
 *   shep agent        Manage and view agent runs
 *   shep feat         Manage features through the SDLC lifecycle
 *   shep settings     Configure Shep settings
 *   shep --version    Display version number only
 *
 * Global Options:
 *   -v, --version  Display version number
 *   -h, --help     Display help
 */

// IMPORTANT: reflect-metadata must be imported first for tsyringe DI
import 'reflect-metadata';

import { Command } from 'commander';
import type { IVersionService } from '../../application/ports/output/services/version-service.interface.js';
import { createVersionCommand } from './commands/version.command.js';
import { createSettingsCommand } from './commands/settings/index.js';
import { createUiCommand } from './commands/ui.command.js';
import { createRunCommand } from './commands/run.command.js';
import { createAgentCommand } from './commands/agent/index.js';
import { createFeatCommand } from './commands/feat/index.js';
import { createIdeOpenCommand } from './commands/ide-open.command.js';
import { messages } from './ui/index.js';

// DI container and settings
import { initializeContainer, container } from '../../infrastructure/di/container.js';
import { InitializeSettingsUseCase } from '../../application/use-cases/settings/initialize-settings.use-case.js';
import { initializeSettings } from '../../infrastructure/services/settings.service.js';

/**
 * Bootstrap function - initializes all dependencies before CLI starts.
 * Performs async initialization (database, settings) before parsing commands.
 */
async function bootstrap() {
  try {
    // Step 1: Initialize DI container (database + migrations)
    try {
      await initializeContainer();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      messages.error('Failed to initialize database', err);
      throw error; // Re-throw to trigger outer catch
    }

    // Step 2: Initialize settings
    try {
      const initializeSettingsUseCase = container.resolve(InitializeSettingsUseCase);
      const settings = await initializeSettingsUseCase.execute();
      initializeSettings(settings);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      messages.error('Failed to initialize settings', err);
      throw error;
    }

    // Step 3: Set up Commander CLI
    const versionService = container.resolve<IVersionService>('IVersionService');
    const { version, description } = versionService.getVersion();

    const program = new Command()
      .name('shep')
      .description(description)
      .version(version, '-v, --version', 'Display version number')
      .action(() => {
        program.outputHelp();
      });

    // Register commands
    program.addCommand(createVersionCommand());
    program.addCommand(createSettingsCommand());
    program.addCommand(createUiCommand());
    program.addCommand(createRunCommand());
    program.addCommand(createAgentCommand());
    program.addCommand(createFeatCommand());
    program.addCommand(createIdeOpenCommand());

    // Parse arguments (parseAsync needed for async command actions like init)
    await program.parseAsync();
  } catch (_error) {
    // Final catch - already logged specific error above
    process.exit(1);
  }
}

// Global error handlers
process.on('uncaughtException', (error) => {
  messages.error('An unexpected error occurred', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  messages.error('Unhandled promise rejection', error);
  process.exit(1);
});

// Start the CLI
bootstrap();
