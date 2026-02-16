/**
 * Cursor Executor Service
 *
 * Infrastructure implementation of IAgentExecutor for the Cursor agent.
 * Executes prompts via the `agent` CLI subprocess with JSON and stream-json
 * output formats.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import type { AgentType, AgentFeature } from '../../../../../domain/generated/output.js';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '../types.js';

/** Features supported by Cursor CLI */
const SUPPORTED_FEATURES = new Set<string>(['session-resume', 'streaming']);

/**
 * Executor service for Cursor agent.
 * Uses subprocess spawning to interact with the `agent` CLI.
 */
export class CursorExecutorService implements IAgentExecutor {
  readonly agentType: AgentType = 'cursor' as AgentType;

  /** When true, suppresses debug logging (set per-call via options.silent) */
  private silent = false;

  constructor(private readonly spawn: SpawnFunction) {}

  /** Debug logging — writes to stdout so it appears in the worker log file */
  private log(message: string): void {
    if (this.silent) return;
    const ts = new Date().toISOString();
    process.stdout.write(`[${ts}] [cursor-executor] ${message}\n`);
  }

  supportsFeature(feature: AgentFeature): boolean {
    return SUPPORTED_FEATURES.has(feature as string);
  }

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.silent = options?.silent ?? false;
    const args = this.buildStreamArgs(prompt, options);
    const spawnOpts = this.buildSpawnOptions(options);

    this.log(
      `Spawning: agent ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
    );
    this.log(`Spawn options: ${JSON.stringify(spawnOpts)}`);

    const proc = this.spawn('agent', args, spawnOpts);
    this.log(`Subprocess PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);

    if (proc.stdin) proc.stdin.end();

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      let lineBuffer = '';
      let stderr = '';
      let timedOut = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      // Accumulated from assistant events
      let resultText = '';
      let sessionId: string | undefined;
      let metadata: Record<string, unknown> | undefined;

      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          proc.kill();
        }, options.timeout);
      }

      const processLine = (line: string) => {
        this.logStreamEvent(line);
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'assistant' && Array.isArray(parsed.message?.content)) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) resultText += block.text;
            }
          } else if (parsed.type === 'result') {
            if (parsed.session_id) sessionId = parsed.session_id;
            if (parsed.duration_ms !== undefined) {
              metadata = { ...metadata, duration_ms: parsed.duration_ms };
            }
          }
          // user events and tool_call events: logged but don't affect result
        } catch {
          /* malformed JSON — already logged */
        }
      };

      proc.stdout?.on('data', (chunk: Buffer | string) => {
        lineBuffer += chunk.toString();
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) processLine(trimmed);
        }
      });

      proc.stderr?.on('data', (chunk: Buffer | string) => {
        const data = chunk.toString();
        stderr += data;
        this.log(`stderr: ${data.trimEnd()}`);
      });

      proc.on('error', (error: Error) => {
        this.log(`Process error event: ${error.message}`);
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });

      proc.on('close', (code: number | null) => {
        if (lineBuffer.trim()) processLine(lineBuffer.trim());
        this.log(`Process closed with code ${code}, result=${resultText.length} chars`);
        if (timeoutId) clearTimeout(timeoutId);

        if (timedOut) {
          reject(new Error('Agent execution timed out'));
          return;
        }

        if (code !== 0 && code !== null) {
          reject(new Error(stderr.trim() || `Process exited with code ${code}`));
          return;
        }

        const result: AgentExecutionResult = { result: resultText };
        if (sessionId) result.sessionId = sessionId;
        if (metadata) result.metadata = metadata;
        resolve(result);
      });
    });
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    const args = this.buildStreamArgs(prompt, options);
    const spawnOpts = this.buildSpawnOptions(options);
    const proc = this.spawn('agent', args, spawnOpts);

    if (proc.stdin) proc.stdin.end();

    let lineBuffer = '';
    let stderr = '';

    const queue: (AgentExecutionStreamEvent | null)[] = [];
    let resolve: (() => void) | null = null;
    let error: Error | null = null;

    function enqueue(event: AgentExecutionStreamEvent | null) {
      queue.push(event);
      if (resolve) {
        resolve();
        resolve = null;
      }
    }

    function waitForItem(): Promise<void> {
      if (queue.length > 0) return Promise.resolve();
      return new Promise<void>((r) => {
        resolve = r;
      });
    }

    proc.stdout?.on('data', (chunk: Buffer | string) => {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const event = this.parseStreamLine(trimmed);
        if (event) enqueue(event);
      }
    });

    proc.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err: Error) => {
      error = err;
      enqueue(null);
    });

    proc.on('close', (code: number | null) => {
      if (lineBuffer.trim()) {
        const event = this.parseStreamLine(lineBuffer.trim());
        if (event) enqueue(event);
      }
      if (code !== 0 && code !== null && stderr.trim()) {
        enqueue({ type: 'error', content: stderr.trim(), timestamp: new Date() });
      }
      enqueue(null);
    });

    while (true) {
      await waitForItem();
      const item = queue.shift();
      if (item === null || item === undefined) {
        if (error !== null) {
          yield {
            type: 'error' as const,
            content: (error as Error).message,
            timestamp: new Date(),
          };
        }
        return;
      }
      yield item;
    }
  }

  /**
   * Log a stream-json line as a human-readable event in the worker log.
   */
  private logStreamEvent(line: string): void {
    try {
      const parsed = JSON.parse(line);

      if (parsed.type === 'assistant' && Array.isArray(parsed.message?.content)) {
        for (const block of parsed.message.content) {
          if (block.type === 'text' && block.text?.trim()) {
            this.log(`[text] ${block.text.trim().replace(/\n/g, ' ')}`);
          }
        }
        return;
      }

      if (parsed.type === 'tool_call') {
        const toolName =
          Object.keys(parsed).find((k) => k.endsWith('ToolCall') || k.endsWith('toolCall')) ??
          'unknown';
        this.log(`[tool] ${parsed.subtype ?? 'call'}: ${toolName}`);
        return;
      }

      if (parsed.type === 'result') {
        this.log(
          `[result] session=${parsed.session_id ?? 'none'}, duration=${parsed.duration_ms ?? 'unknown'}ms`
        );
        return;
      }

      if (parsed.type === 'user') return; // Skip echoed input
    } catch {
      if (line.length > 0) this.log(`[raw] ${line}`);
    }
  }

  private buildArgs(prompt: string, options?: AgentExecutionOptions): string[] {
    const args = ['-p', prompt, '--output-format', 'json', '--force'];
    if (options?.resumeSession) args.push('--resume', options.resumeSession);
    if (options?.model) args.push('-m', options.model);
    // Unsupported options silently omitted: systemPrompt, allowedTools, maxTurns, outputSchema
    // No auth flags — binary handles its own auth
    return args;
  }

  private buildStreamArgs(prompt: string, options?: AgentExecutionOptions): string[] {
    const args = this.buildArgs(prompt, options);
    const fmtIdx = args.indexOf('--output-format');
    if (fmtIdx !== -1) args[fmtIdx + 1] = 'stream-json';
    return args;
  }

  private buildSpawnOptions(options?: AgentExecutionOptions): Record<string, unknown> {
    const spawnOpts: Record<string, unknown> = {};
    if (options?.cwd) spawnOpts.cwd = options.cwd;
    return spawnOpts;
  }

  private parseStreamLine(line: string): AgentExecutionStreamEvent | null {
    try {
      const parsed = JSON.parse(line);

      if (parsed.type === 'assistant' && Array.isArray(parsed.message?.content)) {
        const textParts: string[] = [];
        for (const block of parsed.message.content) {
          if (block.type === 'text' && block.text) textParts.push(block.text);
        }
        if (textParts.length > 0) {
          return { type: 'progress', content: textParts.join(''), timestamp: new Date() };
        }
        return null;
      }

      if (parsed.type === 'tool_call' && parsed.subtype === 'completed') {
        const toolName =
          Object.keys(parsed).find((k) => k.endsWith('ToolCall') || k.endsWith('toolCall')) ??
          'tool';
        return { type: 'progress', content: `Tool completed: ${toolName}`, timestamp: new Date() };
      }

      if (parsed.type === 'tool_call' && parsed.subtype === 'started') {
        const toolName =
          Object.keys(parsed).find((k) => k.endsWith('ToolCall') || k.endsWith('toolCall')) ??
          'tool';
        return { type: 'progress', content: `Tool started: ${toolName}`, timestamp: new Date() };
      }

      if (parsed.type === 'result') {
        return { type: 'result', content: parsed.session_id ?? '', timestamp: new Date() };
      }

      if (parsed.type === 'user') return null; // Skip echoed input

      if (parsed.type === 'error') {
        return {
          type: 'error',
          content: parsed.error ?? parsed.message ?? '',
          timestamp: new Date(),
        };
      }

      return null;
    } catch {
      return { type: 'progress', content: line, timestamp: new Date() };
    }
  }
}
