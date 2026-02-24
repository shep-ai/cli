/**
 * Session Command Group Unit Tests
 *
 * Tests for the session command group that registers ls and show subcommands.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue([]) }),
  },
}));

vi.mock('@/application/use-cases/agents/list-agent-sessions.use-case.js', () => ({
  ListAgentSessionsUseCase: class {
    execute = vi.fn().mockResolvedValue([]);
  },
}));

vi.mock('@/application/use-cases/agents/get-agent-session.use-case.js', () => ({
  GetAgentSessionUseCase: class {
    execute = vi.fn().mockResolvedValue(null);
  },
}));

import { createSessionCommand } from '../../../../../../src/presentation/cli/commands/session/index.js';

describe('session command group', () => {
  it('should create a command named "session"', () => {
    const cmd = createSessionCommand();
    expect(cmd.name()).toBe('session');
  });

  it('should have a description', () => {
    const cmd = createSessionCommand();
    expect(cmd.description()).toBeTruthy();
    expect(cmd.description().length).toBeGreaterThan(0);
  });

  it('should have a "ls" subcommand', () => {
    const cmd = createSessionCommand();
    const subcommandNames = cmd.commands.map((c) => c.name());
    expect(subcommandNames).toContain('ls');
  });

  it('should have a "show" subcommand', () => {
    const cmd = createSessionCommand();
    const subcommandNames = cmd.commands.map((c) => c.name());
    expect(subcommandNames).toContain('show');
  });

  it('should have exactly two subcommands', () => {
    const cmd = createSessionCommand();
    expect(cmd.commands).toHaveLength(2);
  });
});
