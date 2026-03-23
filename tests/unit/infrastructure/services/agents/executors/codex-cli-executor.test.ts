/**
 * CodexCliExecutorService Unit Tests
 *
 * Tests for the OpenAI Codex CLI subprocess executor service.
 * Uses constructor-injected spawn function mock (NOT vi.mock of child_process).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import * as fs from 'node:fs';
import { CodexCliExecutorService } from '@/infrastructure/services/agents/common/executors/codex-cli-executor.service.js';
import type { SpawnFunction } from '@/infrastructure/services/agents/common/types.js';
import { AgentType, AgentFeature } from '@/domain/generated/output.js';
import type { AgentConfig } from '@/domain/generated/output.js';

/**
 * Creates a mock ChildProcess-like object that can emit events and provide
 * stdout/stderr streams for testing subprocess interactions.
 */
function createMockChildProcess() {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const proc = new EventEmitter() as EventEmitter & {
    stdin: PassThrough;
    stdout: PassThrough;
    stderr: PassThrough;
    pid: number;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdin = stdin;
  proc.stdout = stdout;
  proc.stderr = stderr;
  proc.pid = 12345;
  proc.kill = vi.fn();
  return proc;
}

/** Build a Codex JSONL thread.started event */
function threadStarted(threadId: string): string {
  return JSON.stringify({ type: 'thread.started', thread_id: threadId });
}

/** Build a Codex JSONL item.completed agent_message event */
function agentMessageCompleted(text: string): string {
  return JSON.stringify({
    type: 'item.completed',
    item: { type: 'agent_message', content: [{ type: 'text', text }] },
  });
}

/** Build a Codex JSONL turn.completed event */
function turnCompleted(usage?: { input_tokens: number; output_tokens: number }): string {
  return JSON.stringify({ type: 'turn.completed', ...(usage ? { usage } : {}) });
}

/** Build a Codex JSONL item.started event */
function itemStarted(itemType: string, extra?: Record<string, unknown>): string {
  return JSON.stringify({
    type: 'item.started',
    item: { type: itemType, ...extra },
  });
}

/** Build a Codex JSONL item.updated event */
function itemUpdated(itemType: string, content: unknown): string {
  return JSON.stringify({
    type: 'item.updated',
    item: { type: itemType, content },
  });
}

/** Build a Codex JSONL item.completed event for commands/files */
function itemCompleted(itemType: string, extra?: Record<string, unknown>): string {
  return JSON.stringify({
    type: 'item.completed',
    item: { type: itemType, ...extra },
  });
}

/** Emit JSONL lines on stdout then close the process */
function emitJsonlLines(
  proc: ReturnType<typeof createMockChildProcess>,
  lines: string[],
  stderrData: string | null,
  exitCode: number | null
) {
  process.nextTick(() => {
    for (const line of lines) {
      proc.stdout.write(`${line}\n`);
    }
    proc.stdout.end();
    if (stderrData !== null) proc.stderr.write(stderrData);
    proc.stderr.end();
    proc.emit('close', exitCode);
  });
}

describe('CodexCliExecutorService', () => {
  let mockSpawn: SpawnFunction;
  let executor: CodexCliExecutorService;

  beforeEach(() => {
    mockSpawn = vi.fn();
    executor = new CodexCliExecutorService(mockSpawn);
  });

  // --- Task 2: Scaffold, agentType, supportsFeature ---

  describe('agentType', () => {
    it('should have agentType of CodexCli', () => {
      expect(executor.agentType).toBe(AgentType.CodexCli);
    });
  });

  describe('supportsFeature', () => {
    it('should support session-resume feature', () => {
      expect(executor.supportsFeature(AgentFeature.sessionResume)).toBe(true);
    });

    it('should support streaming feature', () => {
      expect(executor.supportsFeature(AgentFeature.streaming)).toBe(true);
    });

    it('should support structured-output feature', () => {
      expect(executor.supportsFeature(AgentFeature.structuredOutput)).toBe(true);
    });

    it('should NOT support system-prompt feature', () => {
      expect(executor.supportsFeature(AgentFeature.systemPrompt)).toBe(false);
    });

    it('should NOT support tool-scoping feature', () => {
      expect(executor.supportsFeature(AgentFeature.toolScoping)).toBe(false);
    });

    it('should NOT support session-listing feature', () => {
      expect(executor.supportsFeature(AgentFeature.sessionListing)).toBe(false);
    });
  });

  // --- Task 3: execute() with basic prompt execution and JSONL parsing ---

  describe('execute', () => {
    it('should spawn codex with correct base args', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Analyze this', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('thread-1'), agentMessageCompleted('Done'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('exec');
      expect(spawnArgs).toContain('-');
      expect(spawnArgs).toContain('--json');
      expect(spawnArgs).toContain('--sandbox');
      expect(spawnArgs).toContain('danger-full-access');
      expect(spawnArgs).toContain('--skip-git-repo-check');
      expect(spawnArgs).toContain('--color');
      expect(spawnArgs).toContain('never');
    });

    it('should pipe prompt via stdin, not in CLI args', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const stdinWriteSpy = vi.spyOn(mockProc.stdin, 'write');

      const executePromise = executor.execute('My big prompt', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('Result'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      // Prompt written to stdin
      expect(stdinWriteSpy).toHaveBeenCalledWith('My big prompt');
      // Prompt NOT in CLI args
      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).not.toContain('My big prompt');
    });

    it('should parse JSONL to extract response text from agent_message events', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Prompt', { silent: true });
      emitJsonlLines(
        mockProc,
        [
          threadStarted('t-1'),
          agentMessageCompleted('Hello '),
          agentMessageCompleted('World'),
          turnCompleted(),
        ],
        null,
        0
      );

      const result = await executePromise;
      expect(result.result).toBe('Hello World');
    });

    it('should extract thread_id from thread.started as sessionId', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Prompt', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('my-thread-abc'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      const result = await executePromise;
      expect(result.sessionId).toBe('my-thread-abc');
    });

    it('should return undefined sessionId when thread.started is missing', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Prompt', { silent: true });
      emitJsonlLines(mockProc, [agentMessageCompleted('OK'), turnCompleted()], null, 0);

      const result = await executePromise;
      expect(result.sessionId).toBeUndefined();
    });

    it('should handle agent_message with string content', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Prompt', { silent: true });
      emitJsonlLines(
        mockProc,
        [
          threadStarted('t-1'),
          JSON.stringify({
            type: 'item.completed',
            item: { type: 'agent_message', content: 'Plain string content' },
          }),
          turnCompleted(),
        ],
        null,
        0
      );

      const result = await executePromise;
      expect(result.result).toBe('Plain string content');
    });

    // --- Task 4: model, cwd, usage ---

    it('should pass --model flag when model option is provided', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', {
        model: 'gpt-5.4',
        silent: true,
      });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--model');
      expect(spawnArgs).toContain('gpt-5.4');
    });

    it('should pass --cd flag when cwd option is provided', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', {
        cwd: '/some/project',
        silent: true,
      });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--cd');
      expect(spawnArgs).toContain('/some/project');
    });

    it('should extract usage from turn.completed JSONL event', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [
          threadStarted('t-1'),
          agentMessageCompleted('OK'),
          turnCompleted({ input_tokens: 200, output_tokens: 50 }),
        ],
        null,
        0
      );

      const result = await executePromise;
      expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 50 });
    });

    it('should return undefined usage when turn.completed has no usage data', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      const result = await executePromise;
      expect(result.usage).toBeUndefined();
    });

    // --- Task 5: Authentication injection ---

    it('should set CODEX_API_KEY when authConfig uses token auth', async () => {
      const authConfig: AgentConfig = {
        type: AgentType.CodexCli,
        authMethod: 'token' as any,
        token: 'my-codex-key-123',
      };
      const tokenExecutor = new CodexCliExecutorService(mockSpawn, authConfig);
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = tokenExecutor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnOpts = vi.mocked(mockSpawn).mock.calls[0][2] as Record<string, unknown>;
      const env = spawnOpts.env as Record<string, string>;
      expect(env.CODEX_API_KEY).toBe('my-codex-key-123');
    });

    it('should NOT set CODEX_API_KEY when authConfig uses session auth', async () => {
      const originalKey = process.env.CODEX_API_KEY;
      delete process.env.CODEX_API_KEY;

      const authConfig: AgentConfig = {
        type: AgentType.CodexCli,
        authMethod: 'session' as any,
      };
      const sessionExecutor = new CodexCliExecutorService(mockSpawn, authConfig);
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = sessionExecutor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnOpts = vi.mocked(mockSpawn).mock.calls[0][2] as Record<string, unknown>;
      const env = spawnOpts.env as Record<string, string>;
      expect(env.CODEX_API_KEY).toBeUndefined();

      if (originalKey !== undefined) process.env.CODEX_API_KEY = originalKey;
    });

    it('should strip CLAUDECODE from spawn environment', async () => {
      const originalEnv = process.env.CLAUDECODE;
      process.env.CLAUDECODE = 'some-value';

      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnOpts = vi.mocked(mockSpawn).mock.calls[0][2] as Record<string, unknown>;
      const env = spawnOpts.env as Record<string, string>;
      expect(env.CLAUDECODE).toBeUndefined();

      if (originalEnv !== undefined) process.env.CLAUDECODE = originalEnv;
      else delete process.env.CLAUDECODE;
    });

    // --- Task 6: Session resume ---

    it('should use resume syntax when resumeSession is provided', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Continue work', {
        resumeSession: 'thread-abc-123',
        silent: true,
      });
      emitJsonlLines(
        mockProc,
        [threadStarted('thread-abc-123'), agentMessageCompleted('Resumed'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('exec');
      expect(spawnArgs).toContain('resume');
      expect(spawnArgs).toContain('thread-abc-123');
    });

    it('should pass prompt as positional arg for resume, not stdin', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const stdinWriteSpy = vi.spyOn(mockProc.stdin, 'write');

      const executePromise = executor.execute('Follow-up prompt', {
        resumeSession: 'thread-abc',
        silent: true,
      });
      emitJsonlLines(
        mockProc,
        [threadStarted('thread-abc'), agentMessageCompleted('Done'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      // Prompt is in args, not stdin
      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('Follow-up prompt');
      // stdin should NOT have the prompt written
      expect(stdinWriteSpy).not.toHaveBeenCalledWith('Follow-up prompt');
    });

    it('should still use stdin for non-resume executions', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const stdinWriteSpy = vi.spyOn(mockProc.stdin, 'write');

      const executePromise = executor.execute('Initial prompt', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      expect(stdinWriteSpy).toHaveBeenCalledWith('Initial prompt');
      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('-');
      expect(spawnArgs).not.toContain('resume');
    });

    it('should include all base flags in resume mode', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('More work', {
        resumeSession: 'thread-xyz',
        silent: true,
      });
      emitJsonlLines(
        mockProc,
        [threadStarted('thread-xyz'), agentMessageCompleted('Done'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--json');
      expect(spawnArgs).toContain('--sandbox');
      expect(spawnArgs).toContain('danger-full-access');
      expect(spawnArgs).toContain('--skip-git-repo-check');
      expect(spawnArgs).toContain('--color');
      expect(spawnArgs).toContain('never');
    });

    // --- Task 7: Error handling ---

    it('should include install instructions on ENOENT error', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });

      process.nextTick(() => {
        const error = new Error('spawn codex ENOENT') as Error & { code: string };
        error.code = 'ENOENT';
        mockProc.emit('error', error);
      });

      await expect(executePromise).rejects.toThrow(
        'Codex CLI ("codex") not found. Please install it: npm i -g @openai/codex'
      );
    });

    it('should reject with stderr content on non-zero exit code', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Bad prompt', { silent: true });
      emitJsonlLines(mockProc, [], 'Error: Authentication failed', 1);

      await expect(executePromise).rejects.toThrow('Process exited with code 1');
    });

    it('should include stderr in error message on non-zero exit', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Bad prompt', { silent: true });
      emitJsonlLines(mockProc, [], 'Authentication failed', 1);

      await expect(executePromise).rejects.toThrow('Authentication failed');
    });

    it('should skip malformed JSON lines gracefully', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Prompt', { silent: true });
      emitJsonlLines(
        mockProc,
        [
          threadStarted('t-1'),
          'this is not valid json {{{',
          agentMessageCompleted('Result text'),
          turnCompleted(),
        ],
        null,
        0
      );

      const result = await executePromise;
      expect(result.result).toBe('Result text');
    });

    it('should apply timeout and kill subprocess', async () => {
      vi.useFakeTimers();
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Long running', { timeout: 5000, silent: true });

      vi.advanceTimersByTime(5001);

      mockProc.stdout.end();
      mockProc.stderr.end();
      mockProc.emit('close', null);

      await expect(executePromise).rejects.toThrow(/timed out/i);
      expect(mockProc.kill).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should detect fatal stderr patterns on exit code 0', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('Partial')],
        'authentication failed: invalid api key',
        0
      );

      await expect(executePromise).rejects.toThrow(/fatal error.*stderr/i);
    });

    it('should detect rate limit pattern in stderr on exit 0', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('Partial')],
        'rate limit exceeded for model gpt-5.4',
        0
      );

      await expect(executePromise).rejects.toThrow(/fatal error.*stderr/i);
    });

    it('should NOT reject for non-fatal stderr messages with exit code 0', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('Success!'), turnCompleted()],
        'Warning: something benign happened\nLoading model...',
        0
      );

      const result = await executePromise;
      expect(result.result).toBe('Success!');
    });

    // --- Task 9: Structured output ---

    it('should pass --output-schema flag when outputSchema is provided', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', {
        outputSchema: { type: 'object', properties: { name: { type: 'string' } } },
        silent: true,
      });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('{"name":"test"}'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('--output-schema');
      // The next arg should be a temp file path
      const schemaIdx = spawnArgs.indexOf('--output-schema');
      const schemaPath = spawnArgs[schemaIdx + 1];
      expect(schemaPath).toMatch(/codex-schema-/);
    });

    it('should NOT include --output-schema flag when outputSchema is not provided', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', { silent: true });
      emitJsonlLines(
        mockProc,
        [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
        null,
        0
      );

      await executePromise;

      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).not.toContain('--output-schema');
    });

    it('should clean up temp schema file even on execution error', async () => {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test', {
        outputSchema: { type: 'object' },
        silent: true,
      });

      // Capture the temp file path from the spawn args
      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      const schemaIdx = spawnArgs.indexOf('--output-schema');
      const tempPath = spawnArgs[schemaIdx + 1];

      emitJsonlLines(mockProc, [], 'Fatal error', 1);

      await expect(executePromise).rejects.toThrow();

      // After the promise rejects, the finally block should have cleaned up.
      // Verify the temp file no longer exists (it was created by the real fs.writeFileSync
      // and should be deleted by the finally block's fs.unlinkSync).
      expect(fs.existsSync(tempPath)).toBe(false);
    });
  });

  // --- Task 8: executeStream ---

  describe('executeStream', () => {
    const tick = () => new Promise((r) => setTimeout(r, 10));

    /** Collect all stream events, writing stdout lines and closing the process */
    async function streamWith(
      exec: CodexCliExecutorService,
      opts: {
        lines?: string[];
        stderrData?: string;
        exitCode?: number;
        execOpts?: Parameters<CodexCliExecutorService['executeStream']>[1];
        emitError?: Error;
      } = {}
    ): Promise<{ type: string; content: string }[]> {
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);
      const events: { type: string; content: string }[] = [];
      const promise = (async () => {
        for await (const e of exec.executeStream('prompt', { silent: true, ...opts.execOpts })) {
          events.push({ type: e.type, content: e.content });
        }
      })();
      await tick();
      if (opts.emitError) {
        mockProc.emit('error', opts.emitError);
        await promise;
        return events;
      }
      for (const l of opts.lines ?? []) mockProc.stdout.write(`${l}\n`);
      if (opts.stderrData) mockProc.stderr.write(opts.stderrData);
      await tick();
      mockProc.stdout.end();
      mockProc.stderr.end();
      mockProc.emit('close', opts.exitCode ?? 0);
      await promise;
      return events;
    }

    it('should yield progress events for agent_message item.started', async () => {
      const events = await streamWith(executor, {
        lines: [
          threadStarted('t-1'),
          itemStarted('agent_message'),
          agentMessageCompleted('Done'),
          turnCompleted(),
        ],
      });
      expect(events).toContainEqual({ type: 'progress', content: '' });
    });

    it('should yield progress events for agent_message item.updated with delta', async () => {
      const events = await streamWith(executor, {
        lines: [
          threadStarted('t-1'),
          itemUpdated('agent_message', [{ type: 'text', text: 'Working...' }]),
          agentMessageCompleted('Working... done'),
          turnCompleted(),
        ],
      });
      expect(events).toContainEqual({ type: 'progress', content: 'Working...' });
    });

    it('should yield progress events for command_execution', async () => {
      const events = await streamWith(executor, {
        lines: [
          threadStarted('t-1'),
          itemStarted('command_execution', { command: 'npm test' }),
          itemCompleted('command_execution', { exit_code: 0 }),
          agentMessageCompleted('Tests passed'),
          turnCompleted(),
        ],
      });
      expect(events).toContainEqual({ type: 'progress', content: 'Running: npm test' });
      expect(events).toContainEqual({
        type: 'progress',
        content: 'Command completed (exit 0)',
      });
    });

    it('should yield progress events for file_change', async () => {
      const events = await streamWith(executor, {
        lines: [
          threadStarted('t-1'),
          itemStarted('file_change'),
          itemCompleted('file_change', { file: 'src/index.ts' }),
          agentMessageCompleted('Modified file'),
          turnCompleted(),
        ],
      });
      expect(events).toContainEqual({ type: 'progress', content: 'Modifying files' });
      expect(events).toContainEqual({ type: 'progress', content: 'Modified: src/index.ts' });
    });

    it('should yield result event with accumulated text on turn.completed', async () => {
      const events = await streamWith(executor, {
        lines: [
          threadStarted('t-1'),
          agentMessageCompleted('Part 1 '),
          agentMessageCompleted('Part 2'),
          turnCompleted(),
        ],
      });
      expect(events).toContainEqual({ type: 'result', content: 'Part 1 Part 2' });
    });

    it('should yield error event on turn.failed', async () => {
      const events = await streamWith(executor, {
        lines: [
          threadStarted('t-1'),
          JSON.stringify({ type: 'turn.failed', error: { message: 'Token limit exceeded' } }),
        ],
      });
      expect(events).toContainEqual({ type: 'error', content: 'Token limit exceeded' });
    });

    it('should skip unknown event types gracefully', async () => {
      const events = await streamWith(executor, {
        lines: [
          threadStarted('t-1'),
          JSON.stringify({ type: 'heartbeat', ts: 123 }),
          agentMessageCompleted('Done'),
          turnCompleted(),
        ],
      });
      // Should only have progress (from item.completed) and result events, no heartbeat
      const heartbeatEvents = events.filter((e) => e.content === '123');
      expect(heartbeatEvents).toHaveLength(0);
    });

    it('should yield non-JSON lines as raw progress', async () => {
      const events = await streamWith(executor, {
        lines: ['Loading model weights...'],
      });
      expect(events).toContainEqual({ type: 'progress', content: 'Loading model weights...' });
    });

    it('should emit error event on non-zero exit code', async () => {
      const events = await streamWith(executor, {
        stderrData: 'Auth error',
        exitCode: 1,
      });
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'error',
          content: expect.stringContaining('Auth error'),
        })
      );
    });

    it('should emit error event on spawn error', async () => {
      const events = await streamWith(executor, {
        emitError: new Error('spawn codex ENOENT'),
      });
      expect(events).toContainEqual({ type: 'error', content: 'spawn codex ENOENT' });
    });

    it('should emit error event when stderr contains fatal patterns on exit 0', async () => {
      const events = await streamWith(executor, {
        stderrData: 'authentication failed: invalid api key',
        exitCode: 0,
      });
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'error',
          content: expect.stringContaining('fatal'),
        })
      );
    });

    it('should include resume args in streaming mode', async () => {
      await streamWith(executor, {
        lines: [threadStarted('t-abc'), agentMessageCompleted('OK'), turnCompleted()],
        execOpts: { resumeSession: 'thread-abc' },
      });
      const spawnArgs = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
      expect(spawnArgs).toContain('resume');
      expect(spawnArgs).toContain('thread-abc');
    });

    it('should set CODEX_API_KEY when using token auth in streaming mode', async () => {
      const authConfig: AgentConfig = {
        type: AgentType.CodexCli,
        authMethod: 'token' as any,
        token: 'stream-key-456',
      };
      const tokenExecutor = new CodexCliExecutorService(mockSpawn, authConfig);
      await streamWith(tokenExecutor, {
        lines: [threadStarted('t-1'), agentMessageCompleted('OK'), turnCompleted()],
      });
      const spawnOpts = vi.mocked(mockSpawn).mock.calls[0][2] as Record<string, unknown>;
      expect((spawnOpts.env as Record<string, string>).CODEX_API_KEY).toBe('stream-key-456');
    });

    it('should yield error event from error JSONL events', async () => {
      const events = await streamWith(executor, {
        lines: [JSON.stringify({ type: 'error', message: 'Unexpected API error' })],
      });
      expect(events).toContainEqual({ type: 'error', content: 'Unexpected API error' });
    });
  });
});
