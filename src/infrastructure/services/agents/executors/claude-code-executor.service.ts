/**
 * Claude Code Executor Service
 *
 * Infrastructure implementation of IAgentExecutor for Claude Code agent.
 * Executes prompts via the `claude` CLI subprocess with JSON and stream-json
 * output formats.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import type { ChildProcess } from 'node:child_process';
import type { AgentType, AgentFeature } from '../../../../domain/generated/output.js';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
} from '../../../../application/ports/output/agent-executor.interface.js';

/**
 * Type for the spawn dependency.
 * Matches the signature of child_process.spawn.
 * Injected via constructor to enable testability.
 */
export type SpawnFunction = (command: string, args: string[], options?: object) => ChildProcess;

/** Features supported by Claude Code CLI */
const SUPPORTED_FEATURES = new Set<string>([
  'session-resume',
  'streaming',
  'system-prompt',
  'structured-output',
]);

/**
 * Executor service for Claude Code agent.
 * Uses subprocess spawning to interact with the `claude` CLI.
 */
export class ClaudeCodeExecutorService implements IAgentExecutor {
  readonly agentType: AgentType = 'claude-code' as AgentType;

  constructor(private readonly spawn: SpawnFunction) {}

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    const args = this.buildArgs(prompt, options);
    const spawnOpts = this.buildSpawnOptions(options);
    const proc = this.spawn('claude', args, spawnOpts);

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          proc.kill();
        }, options.timeout);
      }

      proc.stdout?.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      proc.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      proc.on('error', (error: Error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });

      proc.on('close', (code: number | null) => {
        if (timeoutId) clearTimeout(timeoutId);

        if (timedOut) {
          reject(new Error('Agent execution timed out'));
          return;
        }

        if (code !== 0 && code !== null) {
          reject(new Error(stderr.trim() || `Process exited with code ${code}`));
          return;
        }

        resolve(this.parseJsonResult(stdout));
      });
    });
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    const args = this.buildStreamArgs(prompt, options);
    const spawnOpts = this.buildSpawnOptions(options);
    const proc = this.spawn('claude', args, spawnOpts);

    // Close stdin immediately - we're not sending input in print mode
    if (proc.stdin) {
      proc.stdin.end();
    }

    // Buffer for incomplete lines
    let lineBuffer = '';
    let stderr = '';

    // Create an async queue to bridge event-based IO to async iteration
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
      // Keep the last partial line in the buffer
      lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const event = this.parseStreamLine(trimmed);
        if (event) {
          enqueue(event);
        }
      }
    });

    proc.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err: Error) => {
      error = err;
      enqueue(null); // signal end
    });

    proc.on('close', (code: number | null) => {
      // Process any remaining data in the buffer
      if (lineBuffer.trim()) {
        const event = this.parseStreamLine(lineBuffer.trim());
        if (event) enqueue(event);
      }

      if (code !== 0 && code !== null && stderr.trim()) {
        enqueue({
          type: 'error',
          content: stderr.trim(),
          timestamp: new Date(),
        });
      }
      enqueue(null); // signal end
    });

    // Yield events as they arrive
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

  supportsFeature(feature: AgentFeature): boolean {
    return SUPPORTED_FEATURES.has(feature as string);
  }

  private buildArgs(prompt: string, options?: AgentExecutionOptions): string[] {
    const args = ['-p', prompt, '--output-format', 'json'];
    if (options?.resumeSession) args.push('--resume', options.resumeSession);
    if (options?.model) args.push('--model', options.model);
    if (options?.systemPrompt) args.push('--append-system-prompt', options.systemPrompt);
    if (options?.allowedTools?.length) args.push('--allowedTools', options.allowedTools.join(','));
    if (options?.outputSchema) args.push('--json-schema', JSON.stringify(options.outputSchema));
    if (options?.maxTurns) args.push('--max-turns', String(options.maxTurns));
    return args;
  }

  private buildStreamArgs(prompt: string, options?: AgentExecutionOptions): string[] {
    const args = this.buildArgs(prompt, options);
    const fmtIdx = args.indexOf('--output-format');
    if (fmtIdx !== -1) args[fmtIdx + 1] = 'stream-json';
    // stream-json requires --verbose and --include-partial-messages when using -p (--print)
    // --no-chrome ensures it runs in non-interactive mode without browser integration
    args.push('--verbose', '--include-partial-messages', '--no-chrome');
    return args;
  }

  private buildSpawnOptions(options?: AgentExecutionOptions): Record<string, unknown> {
    const spawnOpts: Record<string, unknown> = {};
    if (options?.cwd) spawnOpts.cwd = options.cwd;
    return spawnOpts;
  }

  private parseJsonResult(stdout: string): AgentExecutionResult {
    const trimmed = stdout.trim();

    try {
      const parsed = JSON.parse(trimmed);
      const result: AgentExecutionResult = {
        result: parsed.result ?? trimmed,
      };

      if (parsed.session_id) {
        result.sessionId = parsed.session_id;
      }

      if (parsed.input_tokens !== undefined && parsed.output_tokens !== undefined) {
        result.usage = {
          inputTokens: parsed.input_tokens,
          outputTokens: parsed.output_tokens,
        };
      }

      // Store additional metadata
      const { result: _r, session_id: _s, input_tokens: _it, output_tokens: _ot, ...rest } = parsed;
      if (Object.keys(rest).length > 0) {
        result.metadata = rest;
      }

      return result;
    } catch {
      // If stdout is not valid JSON, treat it as raw text result
      return { result: trimmed };
    }
  }

  private parseStreamLine(line: string): AgentExecutionStreamEvent | null {
    try {
      const parsed = JSON.parse(line);

      // Handle Claude Code stream_json format with nested events
      if (parsed.type === 'stream_event' && parsed.event) {
        const { event } = parsed;

        // Extract text deltas for progress
        if (event.type === 'content_block_delta' && event.delta?.text) {
          return {
            type: 'progress',
            content: event.delta.text,
            timestamp: new Date(),
          };
        }

        // Message complete - ignore for now (accumulated text is in progress events)
        if (event.type === 'message_stop') {
          return null;
        }
      }

      // Ignore assistant messages - we already get all text via content_block_delta events
      if (parsed.type === 'assistant') {
        return null;
      }

      // Handle legacy format (backward compatibility)
      if (parsed.type === 'result') {
        return {
          type: 'result',
          content: parsed.result ?? '',
          timestamp: new Date(),
        };
      }

      if (parsed.type === 'error') {
        return {
          type: 'error',
          content: parsed.error ?? parsed.message ?? '',
          timestamp: new Date(),
        };
      }

      // Generic progress for other event types (ensure content is a string)
      if (parsed.content || parsed.message) {
        const rawContent = parsed.content ?? parsed.message;
        const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
        return {
          type: 'progress',
          content,
          timestamp: new Date(),
        };
      }

      return null;
    } catch {
      // Non-JSON line, treat as progress text
      return {
        type: 'progress',
        content: line,
        timestamp: new Date(),
      };
    }
  }
}
