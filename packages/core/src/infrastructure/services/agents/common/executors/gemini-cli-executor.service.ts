/**
 * Gemini CLI Executor Service
 *
 * Infrastructure implementation of IAgentExecutor for the Gemini CLI agent.
 * Executes prompts via the `gemini` CLI subprocess with JSON output format.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import type {
  AgentType,
  AgentFeature,
  AgentConfig,
} from '../../../../../domain/generated/output.js';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '../types.js';

/** Features supported by Gemini CLI */
const SUPPORTED_FEATURES = new Set<string>(['session-resume', 'streaming', 'tool-scoping']);

/**
 * Executor service for Gemini CLI agent.
 * Uses subprocess spawning to interact with the `gemini` CLI.
 */
export class GeminiCliExecutorService implements IAgentExecutor {
  readonly agentType: AgentType = 'gemini-cli' as AgentType;

  /** When true, suppresses debug logging (set per-call via options.silent) */
  private silent = false;

  constructor(
    private readonly spawn: SpawnFunction,
    private readonly authConfig?: AgentConfig
  ) {}

  /** Debug logging — writes to stdout so it appears in the worker log file */
  private log(message: string): void {
    if (this.silent) return;
    const ts = new Date().toISOString();
    process.stdout.write(`[${ts}] [gemini-cli-executor] ${message}\n`);
  }

  supportsFeature(feature: AgentFeature): boolean {
    return SUPPORTED_FEATURES.has(feature as string);
  }

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.silent = options?.silent ?? false;
    const args = this.buildArgs(prompt, options, 'json');
    const spawnOpts = this.buildSpawnOptions(options);

    this.log(
      `Spawning: gemini ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
    );
    this.log(`Spawn options: ${JSON.stringify(spawnOpts)}`);

    const proc = this.spawn('gemini', args, spawnOpts);
    this.log(`Subprocess PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);

    if (proc.stdin) proc.stdin.end();

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
        this.log(`Process closed with code ${code}, stdout=${stdout.length} chars`);
        if (timeoutId) clearTimeout(timeoutId);

        if (timedOut) {
          reject(new Error('Agent execution timed out'));
          return;
        }

        if (code !== 0 && code !== null) {
          const message = stderr.trim()
            ? `Process exited with code ${code}: ${stderr.trim()}`
            : `Process exited with code ${code}`;
          reject(new Error(message));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          const result: AgentExecutionResult = { result: parsed.response ?? '' };

          if (parsed.session_id) result.sessionId = parsed.session_id;

          const usage = this.extractUsage(parsed);
          if (usage) result.usage = usage;

          resolve(result);
        } catch {
          reject(new Error(`Failed to parse Gemini JSON output: ${stdout.slice(0, 200)}`));
        }
      });
    });
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    this.silent = options?.silent ?? false;
    const args = this.buildArgs(prompt, options, 'stream-json');
    const spawnOpts = this.buildSpawnOptions(options);
    const proc = this.spawn('gemini', args, spawnOpts);
    if (proc.stdin) proc.stdin.end();

    let lineBuffer = '';
    let stderr = '';
    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

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

    if (options?.timeout) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        proc.kill();
        enqueue({ type: 'error', content: 'Agent execution timed out', timestamp: new Date() });
        enqueue(null);
      }, options.timeout);
    }

    proc.stdout?.on('data', (chunk: Buffer | string) => {
      lineBuffer += chunk.toString();
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const event = this.parseStreamEvent(trimmed);
        if (event) enqueue(event);
      }
    });

    proc.stderr?.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err: Error) => {
      if (timeoutId) clearTimeout(timeoutId);
      error = err;
      enqueue(null);
    });

    proc.on('close', (code: number | null) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (timedOut) return; // already handled by timeout callback

      if (lineBuffer.trim()) {
        const event = this.parseStreamEvent(lineBuffer.trim());
        if (event) enqueue(event);
      }
      if (code !== 0 && code !== null) {
        const msg = stderr.trim()
          ? `Process exited with code ${code}: ${stderr.trim()}`
          : `Process exited with code ${code}`;
        enqueue({ type: 'error', content: msg, timestamp: new Date() });
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
   * Parse a single stream-JSON line into an AgentExecutionStreamEvent.
   * Returns null for events that should be skipped (init, user messages, unknown types).
   */
  private parseStreamEvent(line: string): AgentExecutionStreamEvent | null {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      const type = parsed.type as string;

      switch (type) {
        case 'init':
          return null;
        case 'message':
          if (parsed.role === 'user') return null;
          if (parsed.role === 'assistant' && parsed.delta) {
            return {
              type: 'progress',
              content: (parsed.content as string) ?? '',
              timestamp: new Date(),
            };
          }
          return null;
        case 'tool_use':
          return {
            type: 'progress',
            content: `[tool_use: ${parsed.tool_name}]`,
            timestamp: new Date(),
          };
        case 'tool_result':
          return {
            type: 'progress',
            content: `[tool_result: ${parsed.status}]`,
            timestamp: new Date(),
          };
        case 'result':
          return {
            type: 'result',
            content: (parsed.response as string) ?? '',
            timestamp: new Date(),
          };
        case 'error':
          return {
            type: 'error',
            content: (parsed.message as string) ?? '',
            timestamp: new Date(),
          };
        default:
          return null;
      }
    } catch {
      // Non-JSON line — emit as raw progress
      return { type: 'progress', content: line, timestamp: new Date() };
    }
  }

  /**
   * Extract token usage from Gemini stats structure.
   * Returns undefined if stats are missing (does not throw).
   */
  private extractUsage(
    parsed: Record<string, unknown>
  ): { inputTokens: number; outputTokens: number } | undefined {
    const stats = parsed.stats as Record<string, unknown> | undefined;
    if (!stats?.models) return undefined;

    const models = stats.models as Record<string, Record<string, unknown>>;
    const firstModel = Object.values(models)[0];
    if (!firstModel?.tokens) return undefined;

    const tokens = firstModel.tokens as Record<string, number>;
    if (tokens.prompt === undefined || tokens.candidates === undefined) return undefined;

    return { inputTokens: tokens.prompt, outputTokens: tokens.candidates };
  }

  private buildArgs(
    prompt: string,
    options?: AgentExecutionOptions,
    outputFormat = 'json'
  ): string[] {
    const args = ['-p', prompt, '--output-format', outputFormat, '-y'];

    if (options?.resumeSession) args.push('--resume', options.resumeSession);
    if (options?.model) args.push('-m', options.model);
    if (options?.allowedTools?.length) args.push('--allowed-tools', options.allowedTools.join(','));

    // Unsupported options silently omitted: maxTurns, disableMcp
    if (options?.systemPrompt) {
      this.log('systemPrompt option is not supported by Gemini CLI — ignoring');
    }
    if (options?.outputSchema) {
      this.log('outputSchema option is not supported by Gemini CLI — ignoring');
    }

    return args;
  }

  private buildSpawnOptions(options?: AgentExecutionOptions): Record<string, unknown> {
    const spawnOpts: Record<string, unknown> = {};
    if (options?.cwd) spawnOpts.cwd = options.cwd;

    // Strip CLAUDECODE env var to prevent "nested session" error when shep
    // is invoked from within a Claude Code session.
    const { CLAUDECODE: _, ...cleanEnv } = process.env;

    // Inject GEMINI_API_KEY when using token auth
    if (this.authConfig?.authMethod === 'token' && this.authConfig.token) {
      spawnOpts.env = { ...cleanEnv, GEMINI_API_KEY: this.authConfig.token };
    } else {
      spawnOpts.env = cleanEnv;
    }

    return spawnOpts;
  }
}
