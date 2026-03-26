/**
 * Codex CLI Executor Service
 *
 * Infrastructure implementation of IAgentExecutor for the OpenAI Codex CLI agent.
 * Executes prompts via the `codex` CLI subprocess with JSONL output format.
 *
 * Uses constructor dependency injection for the spawn function
 * to enable testability without mocking node:child_process directly.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type {
  AgentType,
  AgentFeature,
  AgentConfig,
} from '../../../../../domain/generated/output.js';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionUsage,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';
import type { SpawnFunction } from '../types.js';
import { getCurrentPhase, getLogPrefix } from '../../feature-agent/log-context.js';

/** Features supported by Codex CLI */
const SUPPORTED_FEATURES = new Set<string>([
  'session-resume',
  'streaming',
  'structured-output',
  'session-listing',
]);

/**
 * Fatal stderr patterns indicating API-level failures even when exit code is 0.
 * Codex CLI may exit 0 after encountering auth or rate-limit errors.
 */
const FATAL_STDERR_PATTERNS = [
  /authentication.*failed/i,
  /rate.?limit/i,
  /quota.*exceeded/i,
  /invalid.*api.?key/i,
  /RESOURCE_EXHAUSTED/i,
];

/**
 * Executor service for OpenAI Codex CLI agent.
 * Uses subprocess spawning to interact with the `codex` CLI.
 */
export class CodexCliExecutorService implements IAgentExecutor {
  readonly agentType: AgentType = 'codex-cli' as AgentType;

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
    process.stdout.write(`[${ts}] ${getCurrentPhase()}${getLogPrefix()}${message}\n`);
  }

  supportsFeature(feature: AgentFeature): boolean {
    return SUPPORTED_FEATURES.has(feature as string);
  }

  async execute(prompt: string, options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    this.silent = options?.silent ?? false;
    const isResume = !!options?.resumeSession;

    let tempSchemaPath: string | undefined;
    try {
      if (options?.outputSchema) {
        tempSchemaPath = path.join(
          os.tmpdir(),
          `codex-schema-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
        );
        fs.writeFileSync(tempSchemaPath, JSON.stringify(options.outputSchema));
      }

      const args = this.buildArgs(prompt, options, tempSchemaPath);
      const spawnOpts = this.buildSpawnOptions(options);

      this.log(
        `Spawning: codex ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
      );
      this.log(`Spawn cwd: ${(spawnOpts.cwd as string) ?? '(inherited)'}`);

      const proc = this.spawn('codex', args, spawnOpts);
      this.log(`Subprocess PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);
      this.log(
        `Prompt length: ${prompt.length} chars${isResume ? ' (positional arg for resume)' : ' (piped via stdin)'}`
      );
      // Log the actual prompt for debugging (truncate very long prompts)
      const promptPreview = prompt.length > 500 ? `${prompt.slice(0, 497)}...` : prompt;
      this.log(`[text] Prompt: ${promptPreview.replace(/\n/g, ' ')}`);

      // For initial executions, pipe the prompt via stdin.
      // For resume, the prompt is already in the CLI args.
      if (!isResume && proc.stdin) {
        proc.stdin.write(prompt);
        proc.stdin.end();
      }

      return await new Promise<AgentExecutionResult>((resolve, reject) => {
        let lineBuffer = '';
        let stderr = '';
        let timedOut = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        // State accumulated from JSONL events
        let resultText = '';
        let sessionId: string | undefined;
        let usage: AgentExecutionUsage | undefined;

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
            const type = parsed.type as string;

            if (type === 'thread.started' && parsed.thread_id) {
              sessionId = parsed.thread_id;
            } else if (
              type === 'item.completed' &&
              CodexCliExecutorService.MESSAGE_ITEM_TYPES.has(parsed.item?.type)
            ) {
              // Accumulate response text from completed agent messages
              // Codex CLI uses item.text directly; fallback to content blocks
              const text = this.extractItemText(parsed);
              if (text) resultText += text;
            } else if (type === 'turn.completed' && parsed.usage) {
              usage = this.extractUsage(parsed.usage);
            }
          } catch {
            // Malformed JSON line — skip gracefully
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

        proc.on('error', (error: Error & { code?: string }) => {
          this.log(`Process error event: ${error.message}`);
          if (timeoutId) clearTimeout(timeoutId);
          if (error.code === 'ENOENT') {
            reject(
              new Error('Codex CLI ("codex") not found. Please install it: npm i -g @openai/codex')
            );
          } else {
            reject(error);
          }
        });

        proc.on('close', (code: number | null) => {
          // Flush remaining buffer
          if (lineBuffer.trim()) processLine(lineBuffer.trim());

          this.log(`Process closed with code ${code}, result=${resultText.length} chars`);
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

          // Codex CLI may exit 0 despite fatal API errors.
          // Check stderr for known fatal patterns before trusting the output.
          const fatalError = this.detectFatalStderrError(stderr);
          if (fatalError) {
            reject(new Error(fatalError));
            return;
          }

          if (!resultText && !sessionId) {
            reject(new Error(`Empty response from Codex CLI. stderr: ${stderr.slice(0, 300)}`));
            return;
          }

          const result: AgentExecutionResult = { result: resultText };
          if (sessionId) result.sessionId = sessionId;
          if (usage) result.usage = usage;
          resolve(result);
        });
      });
    } finally {
      // Clean up temp schema file
      if (tempSchemaPath) {
        try {
          fs.unlinkSync(tempSchemaPath);
        } catch {
          // Best effort cleanup
        }
      }
    }
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    this.silent = options?.silent ?? false;
    const isResume = !!options?.resumeSession;

    let tempSchemaPath: string | undefined;
    try {
      if (options?.outputSchema) {
        tempSchemaPath = path.join(
          os.tmpdir(),
          `codex-schema-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
        );
        fs.writeFileSync(tempSchemaPath, JSON.stringify(options.outputSchema));
      }

      const args = this.buildArgs(prompt, options, tempSchemaPath);
      const spawnOpts = this.buildSpawnOptions(options);
      const proc = this.spawn('codex', args, spawnOpts);

      // For initial executions, pipe the prompt via stdin.
      // For resume, the prompt is already in the CLI args.
      if (!isResume && proc.stdin) {
        proc.stdin.write(prompt);
        proc.stdin.end();
      }

      let lineBuffer = '';
      let stderr = '';
      let timedOut = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      // State accumulated across events
      let resultText = '';

      const queue: (AgentExecutionStreamEvent | null)[] = [];
      let resolve: (() => void) | null = null;
      let spawnError: Error | null = null;

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

      const processStreamLine = (line: string) => {
        this.logStreamEvent(line);
        try {
          const parsed = JSON.parse(line);
          const type = parsed.type as string;

          if (type === 'thread.started') {
            // Internal state — no event yielded (thread_id tracked for logging)
            return;
          }

          const isMessage = CodexCliExecutorService.MESSAGE_ITEM_TYPES.has(parsed.item?.type);

          if (type === 'item.started' && isMessage) {
            enqueue({ type: 'progress', content: '', timestamp: new Date() });
            return;
          }

          if (type === 'item.updated' && isMessage) {
            const delta = this.extractDeltaText(parsed);
            if (delta) {
              enqueue({ type: 'progress', content: delta, timestamp: new Date() });
            }
            return;
          }

          if (type === 'item.completed' && isMessage) {
            const text = this.extractItemText(parsed);
            if (text) resultText += text;
            return;
          }

          if (type === 'item.started' && parsed.item?.type === 'command_execution') {
            const cmd = parsed.item.command ?? parsed.item.name ?? 'command';
            enqueue({ type: 'progress', content: `Running: ${cmd}`, timestamp: new Date() });
            return;
          }

          if (type === 'item.completed' && parsed.item?.type === 'command_execution') {
            const exitCode = parsed.item.exit_code ?? '';
            enqueue({
              type: 'progress',
              content: `Command completed (exit ${exitCode})`,
              timestamp: new Date(),
            });
            return;
          }

          if (type === 'item.started' && parsed.item?.type === 'file_change') {
            enqueue({ type: 'progress', content: 'Modifying files', timestamp: new Date() });
            return;
          }

          if (type === 'item.completed' && parsed.item?.type === 'file_change') {
            const file = parsed.item.file ?? parsed.item.path ?? '';
            enqueue({
              type: 'progress',
              content: file ? `Modified: ${file}` : 'File change completed',
              timestamp: new Date(),
            });
            return;
          }

          if (type === 'turn.completed') {
            // Yield final result event
            enqueue({
              type: 'result',
              content: resultText,
              timestamp: new Date(),
            });
            return;
          }

          if (type === 'turn.failed') {
            const msg = parsed.error?.message ?? parsed.message ?? 'Turn failed';
            enqueue({ type: 'error', content: msg, timestamp: new Date() });
            return;
          }

          if (type === 'error') {
            const msg = parsed.message ?? parsed.error ?? 'Unknown error';
            enqueue({ type: 'error', content: msg, timestamp: new Date() });
            return;
          }

          // Unknown event type — skip gracefully
        } catch {
          // Non-JSON line — emit as raw progress
          enqueue({ type: 'progress', content: line, timestamp: new Date() });
        }
      };

      proc.stdout?.on('data', (chunk: Buffer | string) => {
        lineBuffer += chunk.toString();
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          processStreamLine(trimmed);
        }
      });

      proc.stderr?.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err: Error) => {
        if (timeoutId) clearTimeout(timeoutId);
        spawnError = err;
        enqueue(null);
      });

      proc.on('close', (code: number | null) => {
        if (timeoutId) clearTimeout(timeoutId);
        if (timedOut) return; // already handled by timeout callback

        if (lineBuffer.trim()) {
          processStreamLine(lineBuffer.trim());
        }

        if (code !== 0 && code !== null) {
          const msg = stderr.trim()
            ? `Process exited with code ${code}: ${stderr.trim()}`
            : `Process exited with code ${code}`;
          enqueue({ type: 'error', content: msg, timestamp: new Date() });
        } else {
          // Check for fatal stderr patterns on exit 0
          const fatalError = this.detectFatalStderrError(stderr);
          if (fatalError) {
            enqueue({ type: 'error', content: fatalError, timestamp: new Date() });
          }
        }
        enqueue(null);
      });

      // Yield events as they arrive
      while (true) {
        await waitForItem();
        const item = queue.shift();
        if (item === null || item === undefined) {
          if (spawnError !== null) {
            yield {
              type: 'error' as const,
              content: (spawnError as Error).message,
              timestamp: new Date(),
            };
          }
          return;
        }
        yield item;
      }
    } finally {
      // Clean up temp schema file
      if (tempSchemaPath) {
        try {
          fs.unlinkSync(tempSchemaPath);
        } catch {
          // Best effort cleanup
        }
      }
    }
  }

  /**
   * Log a JSONL stream line as a human-readable event in the worker log.
   * Extracts tool calls (function_call), assistant text, command executions,
   * and result summaries for verbose debugging.
   */
  /** Item types that represent assistant text messages */
  private static readonly MESSAGE_ITEM_TYPES = new Set(['agent_message', 'message']);

  private logStreamEvent(line: string): void {
    try {
      const parsed = JSON.parse(line);
      const type = parsed.type as string;
      const itemType = parsed.item?.type as string | undefined;

      // Thread lifecycle
      if (type === 'thread.started') {
        this.log(`[thread] started thread_id=${parsed.thread_id ?? 'unknown'}`);
        return;
      }

      // Agent/assistant message text — log the content
      if (
        type === 'item.completed' &&
        itemType &&
        CodexCliExecutorService.MESSAGE_ITEM_TYPES.has(itemType)
      ) {
        const text = this.extractItemText(parsed);
        if (text) {
          const preview = text.length > 200 ? `${text.slice(0, 197)}...` : text;
          this.log(`[text] ${preview.replace(/\n/g, ' ')}`);
        }
        return;
      }

      // Delta/partial updates for messages — log text fragments
      if (
        type === 'item.updated' &&
        itemType &&
        CodexCliExecutorService.MESSAGE_ITEM_TYPES.has(itemType)
      ) {
        const delta = this.extractDeltaText(parsed);
        if (delta) {
          this.log(`[delta] ${delta.replace(/\n/g, ' ')}`);
        }
        return;
      }

      // Reasoning items — model's chain-of-thought
      if (type === 'item.completed' && itemType === 'reasoning') {
        const text = this.extractItemText(parsed);
        if (text) {
          const preview = text.length > 200 ? `${text.slice(0, 197)}...` : text;
          this.log(`[text] Reasoning: ${preview.replace(/\n/g, ' ')}`);
        }
        return;
      }

      // Function/tool calls — log name and arguments
      if (type === 'item.started' && itemType === 'function_call') {
        const name = parsed.item.name ?? parsed.item.call_id ?? 'unknown';
        const args = parsed.item.arguments ?? '';
        this.log(`[tool] ${name} ${typeof args === 'string' ? args : JSON.stringify(args)}`);
        return;
      }
      if (type === 'item.completed' && itemType === 'function_call') {
        const name = parsed.item.name ?? 'unknown';
        this.log(`[tool] ${name} completed`);
        return;
      }

      // Function call output — log truncated result
      if (type === 'item.completed' && itemType === 'function_call_output') {
        const output = parsed.item.output ?? '';
        const preview =
          typeof output === 'string'
            ? output.length > 200
              ? `${output.slice(0, 197)}...`
              : output
            : JSON.stringify(output).slice(0, 200);
        this.log(`[tool-result] ${preview.replace(/\n/g, ' ')}`);
        return;
      }

      // Command executions (Codex shell tool)
      if (type === 'item.started' && itemType === 'command_execution') {
        const cmd = parsed.item.command ?? parsed.item.name ?? 'command';
        this.log(`[cmd] running: ${cmd}`);
        return;
      }
      if (type === 'item.completed' && itemType === 'command_execution') {
        const exitCode = parsed.item.exit_code ?? '';
        const output = parsed.item.output ?? '';
        const preview =
          typeof output === 'string'
            ? output.length > 200
              ? `${output.slice(0, 197)}...`
              : output
            : '';
        this.log(
          `[cmd] exit=${exitCode}${preview ? ` output: ${preview.replace(/\n/g, ' ')}` : ''}`
        );
        return;
      }

      // File changes
      if (type === 'item.started' && itemType === 'file_change') {
        const file = parsed.item.file ?? parsed.item.path ?? '';
        this.log(`[file] modifying: ${file}`);
        return;
      }
      if (type === 'item.completed' && itemType === 'file_change') {
        const file = parsed.item.file ?? parsed.item.path ?? '';
        this.log(`[file] modified: ${file}`);
        return;
      }

      // Turn lifecycle with usage stats
      if (type === 'turn.completed') {
        const u = parsed.usage;
        if (u) {
          const inTokens = u.input_tokens ?? 0;
          const outTokens = u.output_tokens ?? 0;
          this.log(`[tokens] ${inTokens} in / ${outTokens} out`);
        } else {
          this.log('[turn] completed');
        }
        return;
      }

      if (type === 'turn.failed') {
        const msg = parsed.error?.message ?? parsed.message ?? 'unknown';
        this.log(`[turn] FAILED: ${msg}`);
        return;
      }

      // Error events
      if (type === 'error') {
        const msg = parsed.message ?? parsed.error ?? 'unknown';
        this.log(`[error] ${msg}`);
        return;
      }

      // Catch-all: log any unhandled event so nothing is silently dropped
      const summary = itemType ? `${type} (${itemType})` : type;
      const snippet = line.length > 200 ? `${line.slice(0, 197)}...` : line;
      this.log(`[event] ${summary}: ${snippet}`);
    } catch {
      // Non-JSON line — log raw
      if (line.length > 0) {
        this.log(`[raw] ${line}`);
      }
    }
  }

  /**
   * Build CLI arguments for codex exec.
   *
   * For initial execution: `codex exec - --json --sandbox danger-full-access ...`
   * For resume: `codex exec resume <threadId> "prompt" --json --sandbox danger-full-access ...`
   */
  private buildArgs(
    prompt: string,
    options?: AgentExecutionOptions,
    tempSchemaPath?: string
  ): string[] {
    const baseFlags = [
      '--json',
      '--sandbox',
      'danger-full-access',
      '--skip-git-repo-check',
      '--color',
      'never',
    ];

    if (options?.model) baseFlags.push('--model', options.model);
    if (options?.cwd) baseFlags.push('--cd', options.cwd);
    if (tempSchemaPath) baseFlags.push('--output-schema', tempSchemaPath);

    if (options?.resumeSession) {
      // Resume mode: codex exec resume <threadId> "prompt" [flags]
      return ['exec', 'resume', options.resumeSession, prompt, ...baseFlags];
    }

    // Initial execution: codex exec - [flags]
    // The `-` indicates prompt is piped via stdin
    return ['exec', '-', ...baseFlags];
  }

  private buildSpawnOptions(_options?: AgentExecutionOptions): Record<string, unknown> {
    const spawnOpts: Record<string, unknown> = {};

    // Explicitly pipe stdio so streams are available even when parent disconnects
    spawnOpts.stdio = ['pipe', 'pipe', 'pipe'];

    // On Windows: windowsHide=true to prevent blank console windows.
    // Codex CLI is a native Rust binary, so shell=true is NOT needed.
    if (process.platform === 'win32') {
      spawnOpts.windowsHide = true;
    }

    // Strip CLAUDECODE env var to prevent "nested session" error when shep
    // is invoked from within a Claude Code session.
    const { CLAUDECODE: _, ...cleanEnv } = process.env;

    // Inject CODEX_API_KEY when using token auth
    if (this.authConfig?.authMethod === 'token' && this.authConfig.token) {
      spawnOpts.env = { ...cleanEnv, CODEX_API_KEY: this.authConfig.token };
    } else {
      spawnOpts.env = cleanEnv;
    }

    return spawnOpts;
  }

  /**
   * Extract token usage from Codex CLI turn.completed usage object.
   */
  private extractUsage(usageObj: Record<string, number>): AgentExecutionUsage | undefined {
    if (usageObj.input_tokens === undefined && usageObj.output_tokens === undefined) {
      return undefined;
    }
    return {
      inputTokens: usageObj.input_tokens ?? 0,
      outputTokens: usageObj.output_tokens ?? 0,
    };
  }

  /**
   * Extract delta text from an item.updated event.
   * Codex CLI uses `item.text` directly, while other formats use content blocks or `item.delta`.
   */
  private extractDeltaText(parsed: Record<string, unknown>): string | undefined {
    const item = parsed.item as Record<string, unknown> | undefined;
    if (!item) return undefined;
    // Codex CLI format: item.text is a plain string (accumulated so far)
    if (typeof item.text === 'string' && item.text) return item.text;
    // Fallback: content block array
    const content = item.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text' && block.text) return block.text;
      }
    }
    if (typeof item.delta === 'string') return item.delta;
    return undefined;
  }

  /**
   * Extract final text from an item.completed event.
   * Codex CLI uses `item.text` directly, while other formats use `item.content` blocks.
   */
  private extractItemText(parsed: Record<string, unknown>): string | undefined {
    const item = parsed.item as Record<string, unknown> | undefined;
    if (!item) return undefined;
    // Codex CLI format: item.text is a plain string
    if (typeof item.text === 'string' && item.text) return item.text;
    // Fallback: content block array format
    const content = item.content;
    if (Array.isArray(content)) {
      const parts: string[] = [];
      for (const block of content) {
        if (block.type === 'text' && block.text) parts.push(block.text);
      }
      return parts.length > 0 ? parts.join('') : undefined;
    }
    if (typeof content === 'string') return content;
    return undefined;
  }

  /**
   * Check stderr for patterns indicating fatal API errors.
   * Returns an error message if fatal patterns are found, null otherwise.
   */
  private detectFatalStderrError(stderr: string): string | null {
    for (const pattern of FATAL_STDERR_PATTERNS) {
      if (pattern.test(stderr)) {
        const lines = stderr.split('\n').filter((l) => l.trim());
        const summary = lines.slice(0, 3).join(' | ').slice(0, 300);
        return `Codex CLI exited 0 but fatal error detected in stderr: ${summary}`;
      }
    }
    return null;
  }
}
