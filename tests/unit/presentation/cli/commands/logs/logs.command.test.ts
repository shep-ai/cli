/**
 * Tests for Logs Command Structure
 *
 * Verifies that the logs command has all required subcommands.
 */

import { describe, it, expect } from 'vitest';
import { createLogsCommand } from '../../../../../../src/presentation/cli/commands/logs/logs.command.js';

describe('LogsCommand', () => {
  it('should create a command named "logs"', () => {
    const command = createLogsCommand();
    expect(command.name()).toBe('logs');
  });

  it('should have a description', () => {
    const command = createLogsCommand();
    expect(command.description()).toBeTruthy();
  });

  it('should have list subcommand', () => {
    const command = createLogsCommand();
    const listCmd = command.commands.find((cmd) => cmd.name() === 'list');
    expect(listCmd).toBeDefined();
  });

  it('should have view subcommand', () => {
    const command = createLogsCommand();
    const viewCmd = command.commands.find((cmd) => cmd.name() === 'view');
    expect(viewCmd).toBeDefined();
  });

  it('should have search subcommand', () => {
    const command = createLogsCommand();
    const searchCmd = command.commands.find((cmd) => cmd.name() === 'search');
    expect(searchCmd).toBeDefined();
  });

  it('should have tail subcommand', () => {
    const command = createLogsCommand();
    const tailCmd = command.commands.find((cmd) => cmd.name() === 'tail');
    expect(tailCmd).toBeDefined();
  });

  it('should have clear subcommand', () => {
    const command = createLogsCommand();
    const clearCmd = command.commands.find((cmd) => cmd.name() === 'clear');
    expect(clearCmd).toBeDefined();
  });

  it('should have stats subcommand', () => {
    const command = createLogsCommand();
    const statsCmd = command.commands.find((cmd) => cmd.name() === 'stats');
    expect(statsCmd).toBeDefined();
  });
});
