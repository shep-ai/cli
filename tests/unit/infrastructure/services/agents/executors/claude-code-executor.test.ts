/**
 * ClaudeCodeExecutorService Unit Tests
 *
 * Tests for the Claude Code subprocess executor service.
 * Uses constructor-injected spawn function mock (NOT vi.mock of child_process).
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { ClaudeCodeExecutorService } from '../../../../../../src/infrastructure/services/agents/common/executors/claude-code-executor.service.js';
import type { SpawnFunction } from '../../../../../../src/infrastructure/services/agents/common/types.js';
import { AgentType, AgentFeature } from '../../../../../../src/domain/generated/output.js';

/**
 * Creates a mock ChildProcess-like object that can emit events and provide
 * stdout/stderr streams for testing subprocess interactions.
 * Uses PassThrough streams (duplex) that immediately emit data events
 * when written to, avoiding buffering issues with Readable in paused mode.
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

/**
 * Build a stream-json result line (the format execute() now uses internally).
 * execute() parses this from the stream to build AgentExecutionResult.
 */
function buildStreamResult(data: {
  result?: string;
  session_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  [key: string]: unknown;
}): string {
  return JSON.stringify({ type: 'result', ...data });
}

/** Emit stream-json lines followed by close */
function emitStreamData(
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

describe('ClaudeCodeExecutorService', () => {
  let mockSpawn: SpawnFunction;
  let executor: ClaudeCodeExecutorService;

  beforeEach(() => {
    mockSpawn = vi.fn();
    executor = new ClaudeCodeExecutorService(mockSpawn);
  });

  describe('agentType', () => {
    it('should have agentType of ClaudeCode', () => {
      expect(executor.agentType).toBe(AgentType.ClaudeCode);
    });
  });

  describe('supportsFeature', () => {
    it('should support session-resume feature', () => {
      expect(executor.supportsFeature(AgentFeature.sessionResume)).toBe(true);
    });

    it('should support streaming feature', () => {
      expect(executor.supportsFeature(AgentFeature.streaming)).toBe(true);
    });

    it('should support system-prompt feature', () => {
      expect(executor.supportsFeature(AgentFeature.systemPrompt)).toBe(true);
    });

    it('should support structured-output feature', () => {
      expect(executor.supportsFeature(AgentFeature.structuredOutput)).toBe(true);
    });

    it('should NOT support tool-scoping feature', () => {
      expect(executor.supportsFeature(AgentFeature.toolScoping)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute prompt and return result from stream', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({
        result: 'Analysis complete. Found 3 files.',
        session_id: 'sess-abc-123',
        cost_usd: 0.05,
        duration_ms: 1200,
        num_turns: 2,
      });

      const executePromise = executor.execute('Analyze this codebase');
      emitStreamData(mockProc, [resultLine], null, 0);

      // Act
      const result = await executePromise;

      // Assert
      expect(result.result).toBe('Analysis complete. Found 3 files.');
      expect(result.sessionId).toBe('sess-abc-123');
      // execute() now uses stream-json format internally
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['-p', 'Analyze this codebase', '--output-format', 'stream-json']),
        expect.any(Object)
      );
    });

    it('should parse session-id from stream result', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({
        result: 'Done',
        session_id: 'session-xyz-789',
      });

      const executePromise = executor.execute('Do something');
      emitStreamData(mockProc, [resultLine], null, 0);

      // Act
      const result = await executePromise;

      // Assert
      expect(result.sessionId).toBe('session-xyz-789');
    });

    it('should include usage data when present in result', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({
        result: 'Done',
        session_id: 'sess-1',
        input_tokens: 1500,
        output_tokens: 800,
      });

      const executePromise = executor.execute('Test prompt');
      emitStreamData(mockProc, [resultLine], null, 0);

      // Act
      const result = await executePromise;

      // Assert
      expect(result.usage).toEqual({
        inputTokens: 1500,
        outputTokens: 800,
      });
    });

    it('should handle subprocess errors gracefully', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Bad prompt');
      emitStreamData(mockProc, [], 'Error: Authentication failed', 1);

      // Act & Assert
      await expect(executePromise).rejects.toThrow('Authentication failed');
    });

    it('should handle spawn error event', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test');

      process.nextTick(() => {
        mockProc.emit('error', new Error('spawn claude ENOENT'));
      });

      // Act & Assert
      await expect(executePromise).rejects.toThrow('spawn claude ENOENT');
    });

    it('should pass --resume flag when resumeSession option is set', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({ result: 'Resumed', session_id: 'sess-resume' });
      const executePromise = executor.execute('Continue work', {
        resumeSession: 'prev-session-id',
      });
      emitStreamData(mockProc, [resultLine], null, 0);

      await executePromise;

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--resume', 'prev-session-id']),
        expect.any(Object)
      );
    });

    it('should pass --model flag when model option is set', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({ result: 'Done' });
      const executePromise = executor.execute('Test', { model: 'claude-sonnet-4-5-20250929' });
      emitStreamData(mockProc, [resultLine], null, 0);

      await executePromise;

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--model', 'claude-sonnet-4-5-20250929']),
        expect.any(Object)
      );
    });

    it('should pass --append-system-prompt when systemPrompt option is set', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({ result: 'Done' });
      const executePromise = executor.execute('Test', {
        systemPrompt: 'You are a code reviewer',
      });
      emitStreamData(mockProc, [resultLine], null, 0);

      await executePromise;

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--append-system-prompt', 'You are a code reviewer']),
        expect.any(Object)
      );
    });

    it('should pass --allowedTools when allowedTools option is set', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({ result: 'Done' });
      const executePromise = executor.execute('Test', {
        allowedTools: ['Read', 'Write', 'Bash'],
      });
      emitStreamData(mockProc, [resultLine], null, 0);

      await executePromise;

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--allowedTools', 'Read,Write,Bash']),
        expect.any(Object)
      );
    });

    it('should pass --max-turns when maxTurns option is set', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({ result: 'Done' });
      const executePromise = executor.execute('Test', { maxTurns: 5 });
      emitStreamData(mockProc, [resultLine], null, 0);

      await executePromise;

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--max-turns', '5']),
        expect.any(Object)
      );
    });

    it('should pass --json-schema when outputSchema option is set', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const schema = { type: 'object', properties: { summary: { type: 'string' } } };
      const resultLine = buildStreamResult({ result: '{"summary":"test"}' });
      const executePromise = executor.execute('Test', { outputSchema: schema });
      emitStreamData(mockProc, [resultLine], null, 0);

      await executePromise;

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--json-schema', JSON.stringify(schema)]),
        expect.any(Object)
      );
    });

    it('should pass cwd option to spawn', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({ result: 'Done' });
      const executePromise = executor.execute('Test', { cwd: '/some/project' });
      emitStreamData(mockProc, [resultLine], null, 0);

      await executePromise;

      // Assert
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.any(Array),
        expect.objectContaining({ cwd: '/some/project' })
      );
    });

    it('should apply timeout and kill subprocess', async () => {
      // Arrange
      vi.useFakeTimers();
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Long running', { timeout: 5000 });

      // Advance timer past timeout
      vi.advanceTimersByTime(5001);

      // The process should be killed after timeout; emit close
      mockProc.stdout.end();
      mockProc.stderr.end();
      mockProc.emit('close', null);

      // Act & Assert
      await expect(executePromise).rejects.toThrow(/timed out/i);
      expect(mockProc.kill).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should handle empty result gracefully', async () => {
      // Arrange — no result line emitted, just a close
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const executePromise = executor.execute('Test');
      emitStreamData(mockProc, [], null, 0);

      // Act
      const result = await executePromise;

      // Assert — empty result, no crash
      expect(result.result).toBe('');
      expect(result.sessionId).toBeUndefined();
    });

    it('should log tool calls from assistant messages in stream', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const assistantLine = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', name: 'Read', input: { file_path: '/src/index.ts' } },
            { type: 'text', text: 'Let me read the file...' },
          ],
        },
      });
      const resultLine = buildStreamResult({ result: 'Done', session_id: 'sess-1' });

      const executePromise = executor.execute('Test');
      emitStreamData(mockProc, [assistantLine, resultLine], null, 0);

      // Act
      const result = await executePromise;

      // Assert — tool events were processed, result still correct
      expect(result.result).toBe('Done');
      expect(result.sessionId).toBe('sess-1');
    });

    it('should store metadata from result line', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const resultLine = buildStreamResult({
        result: 'Done',
        session_id: 'sess-1',
        input_tokens: 100,
        output_tokens: 50,
        cost_usd: 0.01,
        num_turns: 1,
      });

      const executePromise = executor.execute('Test');
      emitStreamData(mockProc, [resultLine], null, 0);

      // Act
      const result = await executePromise;

      // Assert
      expect(result.metadata).toEqual(expect.objectContaining({ cost_usd: 0.01, num_turns: 1 }));
    });

    describe('disableMcp option', () => {
      it('should add --strict-mcp-config when disableMcp is true', async () => {
        const mockProc = createMockChildProcess();
        vi.mocked(mockSpawn).mockReturnValue(mockProc as any);
        const resultLine = buildStreamResult({ result: 'Done' });
        const executePromise = executor.execute('Test', { disableMcp: true });
        emitStreamData(mockProc, [resultLine], null, 0);
        await executePromise;
        expect(mockSpawn).toHaveBeenCalledWith(
          'claude',
          expect.arrayContaining(['--strict-mcp-config']),
          expect.any(Object)
        );
      });

      it('should NOT add --strict-mcp-config when disableMcp is false', async () => {
        const mockProc = createMockChildProcess();
        vi.mocked(mockSpawn).mockReturnValue(mockProc as any);
        const resultLine = buildStreamResult({ result: 'Done' });
        const executePromise = executor.execute('Test', { disableMcp: false });
        emitStreamData(mockProc, [resultLine], null, 0);
        await executePromise;
        const args = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
        expect(args).not.toContain('--strict-mcp-config');
      });

      it('should NOT add --strict-mcp-config when disableMcp is undefined', async () => {
        const mockProc = createMockChildProcess();
        vi.mocked(mockSpawn).mockReturnValue(mockProc as any);
        const resultLine = buildStreamResult({ result: 'Done' });
        const executePromise = executor.execute('Test', {});
        emitStreamData(mockProc, [resultLine], null, 0);
        await executePromise;
        const args = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
        expect(args).not.toContain('--strict-mcp-config');
      });
    });

    describe('tools option', () => {
      it('should add --tools with comma-separated values when tools provided', async () => {
        const mockProc = createMockChildProcess();
        vi.mocked(mockSpawn).mockReturnValue(mockProc as any);
        const resultLine = buildStreamResult({ result: 'Done' });
        const executePromise = executor.execute('Test', { tools: ['Bash', 'Read', 'Write'] });
        emitStreamData(mockProc, [resultLine], null, 0);
        await executePromise;
        expect(mockSpawn).toHaveBeenCalledWith(
          'claude',
          expect.arrayContaining(['--tools', 'Bash,Read,Write']),
          expect.any(Object)
        );
      });

      it('should NOT add --tools when tools is undefined', async () => {
        const mockProc = createMockChildProcess();
        vi.mocked(mockSpawn).mockReturnValue(mockProc as any);
        const resultLine = buildStreamResult({ result: 'Done' });
        const executePromise = executor.execute('Test', {});
        emitStreamData(mockProc, [resultLine], null, 0);
        await executePromise;
        const args = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
        expect(args).not.toContain('--tools');
      });

      it('should NOT add --tools when tools array is empty', async () => {
        const mockProc = createMockChildProcess();
        vi.mocked(mockSpawn).mockReturnValue(mockProc as any);
        const resultLine = buildStreamResult({ result: 'Done' });
        const executePromise = executor.execute('Test', { tools: [] });
        emitStreamData(mockProc, [resultLine], null, 0);
        await executePromise;
        const args = vi.mocked(mockSpawn).mock.calls[0][1] as string[];
        expect(args).not.toContain('--tools');
      });
    });
  });

  describe('executeStream', () => {
    it('should stream execution events', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const events: { type: string; content: string }[] = [];

      const streamPromise = (async () => {
        for await (const event of executor.executeStream('Implement feature')) {
          events.push({ type: event.type, content: event.content });
          if (event.type === 'result') break;
        }
      })();

      // Simulate streaming output (one JSON object per line)
      const progressEvent = JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Working on it...' }] },
      });
      const resultEvent = JSON.stringify({
        type: 'result',
        result: 'Feature implemented',
        session_id: 'sess-stream',
      });

      // Push events with small delays to allow async iteration
      await new Promise((r) => setTimeout(r, 10));
      mockProc.stdout.write(`${progressEvent}\n`);
      await new Promise((r) => setTimeout(r, 10));
      mockProc.stdout.write(`${resultEvent}\n`);
      await new Promise((r) => setTimeout(r, 10));
      mockProc.stdout.end();
      mockProc.stderr.end();
      mockProc.emit('close', 0);

      await streamPromise;

      // Assert
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        expect.arrayContaining(['--output-format', 'stream-json']),
        expect.any(Object)
      );
    });

    it('should yield error events on subprocess failure', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const events: { type: string; content: string }[] = [];

      const streamPromise = (async () => {
        for await (const event of executor.executeStream('Bad prompt')) {
          events.push({ type: event.type, content: event.content });
        }
      })();

      await new Promise((r) => setTimeout(r, 10));
      mockProc.stderr.write('Fatal error occurred');
      mockProc.stdout.end();
      mockProc.stderr.end();
      mockProc.emit('close', 1);

      await streamPromise;

      // Assert
      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThanOrEqual(1);
      expect(errorEvents[0].content).toContain('Fatal error occurred');
    });

    it('should include timestamps on all events', async () => {
      // Arrange
      const mockProc = createMockChildProcess();
      vi.mocked(mockSpawn).mockReturnValue(mockProc as any);

      const events: { type: string; timestamp: Date }[] = [];

      const streamPromise = (async () => {
        for await (const event of executor.executeStream('Test')) {
          events.push({ type: event.type, timestamp: event.timestamp });
        }
      })();

      const resultEvent = JSON.stringify({
        type: 'result',
        result: 'Done',
      });

      await new Promise((r) => setTimeout(r, 10));
      mockProc.stdout.write(`${resultEvent}\n`);
      await new Promise((r) => setTimeout(r, 10));
      mockProc.stdout.end();
      mockProc.stderr.end();
      mockProc.emit('close', 0);

      await streamPromise;

      // Assert
      for (const event of events) {
        expect(event.timestamp).toBeInstanceOf(Date);
      }
    });
  });
});
