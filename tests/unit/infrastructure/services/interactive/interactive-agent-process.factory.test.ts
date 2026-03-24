/**
 * InteractiveAgentProcessFactory Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * Tests verify that the factory calls IAgentExecutorProvider.getExecutor()
 * to determine the agent type, then spawns the appropriate CLI binary in
 * print mode (-p) with stream-json output and piped stdio.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractiveAgentProcessFactory } from '@/infrastructure/services/interactive/interactive-agent-process.factory.js';
import type { IAgentExecutorProvider } from '@/application/ports/output/agents/agent-executor-provider.interface.js';
import { AgentType } from '@/domain/generated/output.js';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { SpawnFunction } from '@/infrastructure/services/agents/common/types.js';

/** Create a minimal mock ChildProcess for spawn stubs */
function makeFakeProcess(): ChildProcessWithoutNullStreams {
  const emitter = new EventEmitter() as unknown as ChildProcessWithoutNullStreams;
  (emitter as unknown as Record<string, unknown>).stdin = new EventEmitter();
  (emitter as unknown as Record<string, unknown>).stdout = new EventEmitter();
  (emitter as unknown as Record<string, unknown>).stderr = new EventEmitter();
  (emitter as unknown as Record<string, unknown>).pid = 12345;
  (emitter as unknown as Record<string, unknown>).kill = vi.fn();
  return emitter;
}

describe('InteractiveAgentProcessFactory', () => {
  let mockProvider: IAgentExecutorProvider;
  let mockSpawn: ReturnType<typeof vi.fn>;
  let fakeProcess: ChildProcessWithoutNullStreams;
  let factory: InteractiveAgentProcessFactory;

  beforeEach(() => {
    fakeProcess = makeFakeProcess();
    mockSpawn = vi.fn().mockReturnValue(fakeProcess);

    mockProvider = {
      getExecutor: vi.fn().mockResolvedValue({
        agentType: AgentType.ClaudeCode,
        execute: vi.fn(),
        executeStream: vi.fn(),
        supportsFeature: vi.fn(),
      }),
    };

    factory = new InteractiveAgentProcessFactory(
      mockProvider,
      mockSpawn as unknown as SpawnFunction
    );
  });

  it('calls IAgentExecutorProvider.getExecutor() to resolve the agent type', async () => {
    await factory.spawn('/wt/path');
    expect(mockProvider.getExecutor).toHaveBeenCalledOnce();
  });

  it('spawns the claude CLI for ClaudeCode agent type', async () => {
    await factory.spawn('/wt/path');
    expect(mockSpawn).toHaveBeenCalledWith('claude', expect.any(Array), expect.any(Object));
  });

  it('sets cwd to the provided worktreePath', async () => {
    await factory.spawn('/absolute/worktree/path');
    const spawnOptions = mockSpawn.mock.calls[0][2] as Record<string, unknown>;
    expect(spawnOptions.cwd).toBe('/absolute/worktree/path');
  });

  it('uses stdio pipe for stdin, stdout, and stderr', async () => {
    await factory.spawn('/wt/path');
    const spawnOptions = mockSpawn.mock.calls[0][2] as Record<string, unknown>;
    expect(spawnOptions.stdio).toEqual(['pipe', 'pipe', 'pipe']);
  });

  it('includes -p flag for print mode', async () => {
    await factory.spawn('/wt/path');
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('-p');
  });

  it('passes --output-format stream-json to enable line-based JSON events', async () => {
    await factory.spawn('/wt/path');
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--output-format');
    expect(args).toContain('stream-json');
  });

  it('passes --dangerously-skip-permissions flag to claude', async () => {
    await factory.spawn('/wt/path');
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--dangerously-skip-permissions');
  });

  it('includes --include-partial-messages for streaming deltas', async () => {
    await factory.spawn('/wt/path');
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--include-partial-messages');
  });

  it('returns the spawned child process', async () => {
    const result = await factory.spawn('/wt/path');
    expect(result).toBe(fakeProcess);
  });

  it('adds --resume flag when resumeSessionId is provided', async () => {
    await factory.spawn('/wt/path', { resumeSessionId: 'session-xyz' });
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--resume');
    expect(args).toContain('session-xyz');
  });

  it('does not add --resume when no resumeSessionId', async () => {
    await factory.spawn('/wt/path');
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).not.toContain('--resume');
  });

  it('throws a descriptive error for unsupported agent types', async () => {
    mockProvider.getExecutor = vi.fn().mockResolvedValue({
      agentType: 'aider' as AgentType,
      execute: vi.fn(),
      executeStream: vi.fn(),
      supportsFeature: vi.fn(),
    });

    await expect(factory.spawn('/wt/path')).rejects.toThrow(/aider/);
  });

  it('strips CLAUDECODE env var to prevent nested session errors', async () => {
    const origEnv = process.env.CLAUDECODE;
    process.env.CLAUDECODE = 'some-session';
    try {
      await factory.spawn('/wt/path');
      const spawnOptions = mockSpawn.mock.calls[0][2] as Record<string, unknown>;
      const env = spawnOptions.env as Record<string, string | undefined>;
      expect(env.CLAUDECODE).toBeUndefined();
    } finally {
      if (origEnv === undefined) {
        delete process.env.CLAUDECODE;
      } else {
        process.env.CLAUDECODE = origEnv;
      }
    }
  });
});
