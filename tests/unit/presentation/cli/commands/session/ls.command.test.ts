/**
 * Session List Command Unit Tests
 *
 * Tests for the session ls command that lists agent provider CLI sessions.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentSession } from '@/domain/generated/output.js';
import { AgentType } from '@/domain/generated/output.js';

const { mockResolve, mockExecute } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockExecute: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: (...args: unknown[]) => mockResolve(...args),
  },
}));

vi.mock('@/application/use-cases/agents/list-agent-sessions.use-case.js', () => ({
  ListAgentSessionsUseCase: class {
    execute = mockExecute;
  },
}));

import { createLsCommand } from '../../../../../../src/presentation/cli/commands/session/ls.command.js';

function makeSession(overrides?: Partial<AgentSession>): AgentSession {
  return {
    id: 'abc12345-1234-5678-abcd-ef1234567890',
    agentType: AgentType.ClaudeCode,
    projectPath: '~/repos/my-project',
    messageCount: 10,
    preview: 'Help me implement a feature',
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-02T12:00:00Z'),
    lastMessageAt: new Date('2025-01-02T12:00:00Z'),
    ...overrides,
  };
}

describe('session ls command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    mockResolve.mockReturnValue({ execute: mockExecute });
    mockExecute.mockResolvedValue([]);
    process.exitCode = undefined;
  });

  it('should create a command named "ls" with correct description', () => {
    const cmd = createLsCommand();
    expect(cmd.name()).toBe('ls');
    expect(cmd.description()).toContain('session');
  });

  it('should resolve ListAgentSessionsUseCase from container', async () => {
    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(mockResolve).toHaveBeenCalled();
  });

  it('should pass no agentType to use case when no provider flag is given (settings default)', async () => {
    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ agentType: undefined }));
  });

  it('should pass agentType claude-code when --claude-code flag is given', async () => {
    const cmd = createLsCommand();
    await cmd.parseAsync(['--claude-code'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: AgentType.ClaudeCode })
    );
  });

  it('should pass agentType cursor when --cursor-cli flag is given', async () => {
    const cmd = createLsCommand();
    await cmd.parseAsync(['--cursor-cli'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: AgentType.Cursor })
    );
  });

  it('should pass agentType gemini-cli when --gemini-cli flag is given', async () => {
    const cmd = createLsCommand();
    await cmd.parseAsync(['--gemini-cli'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: AgentType.GeminiCli })
    );
  });

  it('should pass default limit 20 when no --limit flag is given', async () => {
    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ limit: 20 }));
  });

  it('should pass --limit value to use case execute', async () => {
    const cmd = createLsCommand();
    await cmd.parseAsync(['--limit', '5'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ limit: 5 }));
  });

  it('should accept -n as alias for --limit', async () => {
    const cmd = createLsCommand();
    await cmd.parseAsync(['-n', '10'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('should render a table with session data', async () => {
    const session = makeSession();
    mockExecute.mockResolvedValue([session]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('abc12345');
    expect(output).toContain('~/repos/my-project');
  });

  it('should show "No sessions found" when list is empty', async () => {
    mockExecute.mockResolvedValue([]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('No sessions found');
  });

  it('should set process.exitCode = 1 on error', async () => {
    mockExecute.mockRejectedValue(new Error('Failed to list sessions'));

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('should display message count in table', async () => {
    const session = makeSession({ messageCount: 42 });
    mockExecute.mockResolvedValue([session]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('42');
  });

  it('should display session preview in table', async () => {
    const session = makeSession({ preview: 'Fix the authentication bug' });
    mockExecute.mockResolvedValue([session]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Fix the authentication bug');
  });
});
