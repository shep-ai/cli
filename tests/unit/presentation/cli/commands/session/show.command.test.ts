/**
 * Session Show Command Unit Tests
 *
 * Tests for the session show command that displays details of a specific session.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AgentSession, AgentSessionMessage } from '@/domain/generated/output.js';
import { AgentType } from '@/domain/generated/output.js';
import { SessionNotFoundError } from '@/domain/errors/session-not-found.error.js';

const { mockResolve, mockExecute } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockExecute: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: (...args: unknown[]) => mockResolve(...args),
  },
}));

vi.mock('@/application/use-cases/agents/get-agent-session.use-case.js', () => ({
  GetAgentSessionUseCase: class {
    execute = mockExecute;
  },
}));

import { createShowCommand } from '../../../../../../src/presentation/cli/commands/session/show.command.js';

function makeMessage(
  role: 'user' | 'assistant',
  content: string,
  uuid = 'msg-uuid-001'
): AgentSessionMessage {
  return {
    uuid,
    role,
    content,
    timestamp: new Date('2025-01-01T10:00:00Z'),
  };
}

function makeSession(overrides?: Partial<AgentSession>): AgentSession {
  return {
    id: 'abc12345-1234-5678-abcd-ef1234567890',
    agentType: AgentType.ClaudeCode,
    projectPath: '~/repos/my-project',
    messageCount: 2,
    preview: 'Help me implement a feature',
    messages: [
      makeMessage('user', 'Help me implement a feature', 'msg-001'),
      makeMessage('assistant', 'Sure, let me help you.', 'msg-002'),
    ],
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-02T12:00:00Z'),
    firstMessageAt: new Date('2025-01-01T10:00:00Z'),
    lastMessageAt: new Date('2025-01-02T12:00:00Z'),
    ...overrides,
  };
}

describe('session show command', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    mockResolve.mockReturnValue({ execute: mockExecute });
    mockExecute.mockResolvedValue(makeSession());
    process.exitCode = undefined;
  });

  it('should create a command named "show" with correct description', () => {
    const cmd = createShowCommand();
    expect(cmd.name()).toBe('show');
    expect(cmd.description()).toContain('session');
  });

  it('should have a required <id> argument', () => {
    const cmd = createShowCommand();
    const args = cmd.registeredArguments;
    expect(args.length).toBeGreaterThan(0);
    expect(args[0].name()).toBe('id');
  });

  it('should resolve GetAgentSessionUseCase from container', async () => {
    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id-123'], { from: 'user' });
    expect(mockResolve).toHaveBeenCalled();
  });

  it('should call execute with the provided session ID', async () => {
    const cmd = createShowCommand();
    await cmd.parseAsync(['my-session-id'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ id: 'my-session-id' }));
  });

  it('should always fetch all messages (messageLimit 0) regardless of --messages flag', async () => {
    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ messageLimit: 0 }));
  });

  it('should fetch all messages even when --messages is specified (client-side slicing)', async () => {
    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id', '--messages', '50'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ messageLimit: 0 }));
  });

  it('should accept --messages 0 for all messages', async () => {
    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id', '--messages', '0'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ messageLimit: 0 }));
  });

  it('should accept -m as alias for --messages', async () => {
    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id', '-m', '30'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ messageLimit: 0 }));
  });

  it('should pass no agentType when no provider flag is given', async () => {
    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({ agentType: undefined }));
  });

  it('should pass agentType claude-code when --claude-code flag is given', async () => {
    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id', '--claude-code'], { from: 'user' });
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: AgentType.ClaudeCode })
    );
  });

  it('should render session metadata in output', async () => {
    const session = makeSession({ id: 'abc12345-1234-5678-abcd-ef1234567890' });
    mockExecute.mockResolvedValue(session);

    const cmd = createShowCommand();
    await cmd.parseAsync(['abc12345'], { from: 'user' });

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('abc12345-1234-5678-abcd-ef1234567890');
    expect(output).toContain('~/repos/my-project');
  });

  it('should render conversation messages in output', async () => {
    const session = makeSession();
    mockExecute.mockResolvedValue(session);

    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id'], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('Help me implement a feature');
    expect(output).toContain('Sure, let me help you.');
  });

  it('should show truncation note when messages shown < total', async () => {
    const session = makeSession({
      messageCount: 100,
      messages: [makeMessage('user', 'First message', 'msg-001')],
    });
    mockExecute.mockResolvedValue(session);

    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id'], { from: 'user' });

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('100');
  });

  it('should set process.exitCode = 1 when session is not found', async () => {
    mockExecute.mockRejectedValue(new SessionNotFoundError('missing-id'));

    const cmd = createShowCommand();
    await cmd.parseAsync(['missing-id'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('should print descriptive error message when session is not found', async () => {
    mockExecute.mockRejectedValue(new SessionNotFoundError('missing-id'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

    const cmd = createShowCommand();
    await cmd.parseAsync(['missing-id'], { from: 'user' });

    const output = errorSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toContain('missing-id');
  });

  it('should set process.exitCode = 1 on generic error', async () => {
    mockExecute.mockRejectedValue(new Error('Unexpected failure'));

    const cmd = createShowCommand();
    await cmd.parseAsync(['session-id'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });
});
