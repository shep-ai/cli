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

import { writeFileSync, unlinkSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
import { getCurrentPhase, getLogPrefix } from '../../feature-agent/log-context.js';
import { IS_WINDOWS } from '../../../../platform.js';

/**
 * Map canonical model IDs (used across shep) to Cursor CLI model names.
 * Cursor uses short names like "sonnet-4.6" instead of "claude-sonnet-4-6".
 * Models that already match Cursor's naming pass through unchanged.
 */
const CURSOR_MODEL_MAP: Record<string, string> = {
  'claude-opus-4-6': 'opus-4.6',
  'claude-sonnet-4-6': 'sonnet-4.6',
  'claude-haiku-4-5': 'haiku-4.5',
  'grok-code': 'grok',
};

function toCursorModelName(model: string): string {
  return CURSOR_MODEL_MAP[model] ?? model;
}

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
    // Use json (not stream-json) for execute() — outputs a single JSON result line.
    // stream-json is unreliable on Windows where shell: true can mangle args.
    const args = this.buildArgs(prompt, options);

    const { proc, tmpFile } = this.spawnAgent(prompt, args, options);

    // Diagnostic: verify streams are connected and process is alive
    this.log(`[diag] proc.pid=${proc.pid}, killed=${proc.killed}`);
    this.log(`[diag] stdout=${!!proc.stdout}, stderr=${!!proc.stderr}, stdin=${!!proc.stdin}`);
    this.log(
      `[diag] CURSOR_API_KEY set=${!!process.env.CURSOR_API_KEY}, len=${process.env.CURSOR_API_KEY?.length ?? 0}`
    );
    this.log(
      `[diag] authConfig.token set=${!!this.authConfig?.token}, method=${this.authConfig?.authMethod ?? 'none'}`
    );
    this.log(`[diag] platform=${process.platform}, cwd=${options?.cwd ?? '(inherited)'}`);

    return new Promise<AgentExecutionResult>((resolve, reject) => {
      let lineBuffer = '';
      let stderr = '';
      let timedOut = false;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let stdoutChunks = 0;
      let stderrChunks = 0;
      const startTime = Date.now();

      // Accumulated from JSON events or raw text fallback
      let resultText = '';
      let rawText = '';
      let sessionId: string | undefined;
      let metadata: Record<string, unknown> | undefined;

      // Periodic heartbeat + zero-output watchdog.
      // Cursor CLI on Windows sometimes starts but never produces any output.
      // If no stdout/stderr arrives within SILENCE_TIMEOUT_MS, kill the process
      // so retryExecute can retry instead of waiting 30 minutes.
      const SILENCE_TIMEOUT_MS = 180_000; // 3 minutes of zero output = stuck
      let lastOutputAt = Date.now();

      const heartbeatId = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const silenceMs = Date.now() - lastOutputAt;
        this.log(
          `[diag] heartbeat ${elapsed}s: stdout_chunks=${stdoutChunks}, stderr_chunks=${stderrChunks}, silence=${Math.round(silenceMs / 1000)}s, pid_killed=${proc.killed}`
        );

        // Kill if zero output for too long
        if (silenceMs > SILENCE_TIMEOUT_MS && !proc.killed) {
          this.log(
            `[diag] SILENCE WATCHDOG: no output for ${Math.round(silenceMs / 1000)}s — killing process`
          );
          timedOut = true;
          if (process.platform === 'win32' && proc.pid) {
            try {
              execFileSync('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore' });
            } catch {
              proc.kill();
            }
          } else {
            proc.kill();
          }
        }
      }, 15_000);

      if (options?.timeout) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          this.log(`[diag] TIMEOUT after ${options.timeout}ms — killing process tree`);
          // On Windows, proc.kill() may not kill the entire process tree
          // (PowerShell + child agent process). Use taskkill /T for tree kill.
          if (process.platform === 'win32' && proc.pid) {
            try {
              execFileSync('taskkill', ['/F', '/T', '/PID', String(proc.pid)], {
                stdio: 'ignore',
              });
              this.log(`[diag] taskkill /T /PID ${proc.pid} succeeded`);
            } catch {
              proc.kill();
              this.log(`[diag] taskkill failed, fell back to proc.kill()`);
            }
          } else {
            proc.kill();
          }
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
            // json format puts the full result text in parsed.result
            if (typeof parsed.result === 'string' && parsed.result) resultText = parsed.result;
            if (parsed.session_id) sessionId = parsed.session_id;
            if (parsed.duration_ms !== undefined) {
              metadata = { ...metadata, duration_ms: parsed.duration_ms };
            }
            if (parsed.is_error) {
              this.log(
                `[diag] result event has is_error=true: ${JSON.stringify(parsed).slice(0, 300)}`
              );
            }
          } else if (parsed.type === 'error') {
            this.log(`[diag] cursor error event: ${JSON.stringify(parsed).slice(0, 500)}`);
          } else if (
            parsed.type !== 'user' &&
            parsed.type !== 'system' &&
            parsed.type !== 'thinking' &&
            parsed.type !== 'tool_call'
          ) {
            this.log(
              `[diag] unknown event type="${parsed.type}": ${JSON.stringify(parsed).slice(0, 300)}`
            );
          }
        } catch {
          // Non-JSON output — accumulate as raw text fallback
          if (line.length > 0) {
            rawText += `${line}\n`;
            this.log(`[diag] non-JSON line (${line.length} chars): ${line.slice(0, 200)}`);
          }
        }
      };

      proc.stdout?.on('data', (chunk: Buffer | string) => {
        stdoutChunks++;
        lastOutputAt = Date.now();
        const data = chunk.toString();
        if (stdoutChunks <= 3) {
          this.log(
            `[diag] stdout chunk #${stdoutChunks}: ${data.length} bytes, first 200: ${data.slice(0, 200).replace(/\n/g, '\\n')}`
          );
        }
        lineBuffer += data;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) processLine(trimmed);
        }
      });

      proc.stderr?.on('data', (chunk: Buffer | string) => {
        stderrChunks++;
        lastOutputAt = Date.now();
        const data = chunk.toString();
        stderr += data;
        this.log(`[diag] stderr chunk #${stderrChunks}: ${data.trimEnd()}`);

        // Detect fatal errors early so callers don't waste time retrying
        if (data.includes('Cannot use this model')) {
          if (timeoutId) clearTimeout(timeoutId);
          clearInterval(heartbeatId);
          proc.kill();
          reject(new Error(data.trim()));
        }
      });

      proc.on('error', (error: Error & { code?: string }) => {
        this.log(`[diag] Process ERROR event: ${error.message} (code=${error.code})`);
        clearInterval(heartbeatId);
        if (timeoutId) clearTimeout(timeoutId);
        if (error.code === 'ENOENT') {
          reject(
            new Error(
              'Cursor agent CLI not found. Please install Cursor and ensure the "cursor" command is available on PATH.'
            )
          );
        } else {
          reject(error);
        }
      });

      proc.on('close', (code: number | null) => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        clearInterval(heartbeatId);
        // Clean up temp file on Windows
        if (tmpFile) {
          try {
            unlinkSync(tmpFile);
          } catch {
            /* already removed or inaccessible */
          }
        }
        if (lineBuffer.trim()) processLine(lineBuffer.trim());
        // Use raw text as fallback when no JSON result was captured
        const finalText = resultText || rawText.trim();
        this.log(
          `[diag] Process CLOSE: code=${code}, elapsed=${elapsed}s, stdout_chunks=${stdoutChunks}, stderr_chunks=${stderrChunks}, result=${finalText.length} chars, raw=${rawText.length} chars`
        );
        if (timeoutId) clearTimeout(timeoutId);

        if (timedOut) {
          reject(new Error('Agent execution timed out'));
          return;
        }

        if (code !== 0 && code !== null) {
          const errMsg = stderr.trim() || `Process exited with code ${code}`;
          this.log(`[diag] non-zero exit — rejecting with: ${errMsg.slice(0, 200)}`);
          reject(new Error(errMsg));
          return;
        }

        if (stdoutChunks === 0 && stderrChunks === 0) {
          this.log(
            `[diag] WARNING: process exited with code 0 but produced ZERO output (stdout=0, stderr=0, elapsed=${elapsed}s)`
          );
        }

        if (!finalText && code === 0) {
          this.log(
            `[diag] WARNING: process exited code=0 but result is empty (resultText=${resultText.length}, rawText=${rawText.length})`
          );
        }

        const result: AgentExecutionResult = { result: finalText };
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
    this.silent = options?.silent ?? false;
    const args = this.buildStreamArgs(prompt, options);
    const { proc, tmpFile } = this.spawnAgent(prompt, args, options);

    this.log(`[stream] pid=${proc.pid}, stdout=${!!proc.stdout}, stderr=${!!proc.stderr}`);

    let lineBuffer = '';
    let stderr = '';
    let stdoutChunks = 0;
    let stderrChunks = 0;
    const startTime = Date.now();

    const queue: (AgentExecutionStreamEvent | null)[] = [];
    let resolve: (() => void) | null = null;
    let error: Error | null = null;

    const enqueue = (event: AgentExecutionStreamEvent | null) => {
      queue.push(event);
      if (resolve) {
        resolve();
        resolve = null;
      }
    };

    function waitForItem(): Promise<void> {
      if (queue.length > 0) return Promise.resolve();
      return new Promise<void>((r) => {
        resolve = r;
      });
    }

    // Heartbeat for stream mode too
    const heartbeatId = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      this.log(
        `[stream] heartbeat ${elapsed}s: stdout_chunks=${stdoutChunks}, stderr_chunks=${stderrChunks}, pid_killed=${proc.killed}`
      );
    }, 30_000);

    proc.stdout?.on('data', (chunk: Buffer | string) => {
      stdoutChunks++;
      const data = chunk.toString();
      if (stdoutChunks <= 3) {
        this.log(`[stream] stdout chunk #${stdoutChunks}: ${data.length} bytes`);
      }
      lineBuffer += data;
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
      stderrChunks++;
      const data = chunk.toString();
      stderr += data;
      this.log(`[stream] stderr chunk #${stderrChunks}: ${data.trimEnd()}`);
    });

    proc.on('error', (err: Error) => {
      this.log(`[stream] Process ERROR: ${err.message}`);
      clearInterval(heartbeatId);
      error = err;
      enqueue(null);
    });

    proc.on('close', (code: number | null) => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      clearInterval(heartbeatId);
      this.log(
        `[stream] Process CLOSE: code=${code}, elapsed=${elapsed}s, stdout_chunks=${stdoutChunks}, stderr_chunks=${stderrChunks}`
      );
      if (tmpFile) {
        try {
          unlinkSync(tmpFile);
        } catch {
          /* already removed */
        }
      }
      if (lineBuffer.trim()) {
        const event = this.parseStreamLine(lineBuffer.trim());
        if (event) enqueue(event);
      }
      if (code !== 0 && code !== null) {
        const errMsg = stderr.trim() || `Process exited with code ${code}`;
        this.log(`[stream] non-zero exit: ${errMsg}`);
        enqueue({ type: 'error', content: errMsg, timestamp: new Date() });
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

      // Log any unrecognized event type so nothing is silently dropped
      if (
        !['assistant', 'tool_call', 'result', 'user', 'system', 'thinking'].includes(parsed.type)
      ) {
        this.log(`[diag] unhandled stream event type="${parsed.type}": ${line.slice(0, 200)}`);
      }
    } catch {
      if (line.length > 0) this.log(`[raw] ${line}`);
    }
  }

  private buildArgs(prompt: string, options?: AgentExecutionOptions): string[] {
    const args = ['--yolo', '-p', prompt, '--output-format', 'json'];
    if (options?.resumeSession) args.push('--resume', options.resumeSession);
    if (options?.model) args.push('--model', toCursorModelName(options.model));
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

  /**
   * Resolve the cursor CLI's bundled node.exe and index.js paths on Windows.
   *
   * The cursor CLI installs to `%LOCALAPPDATA%\cursor-agent\` with:
   *   - `agent.cmd` / `cursor-agent.ps1` (shell wrappers)
   *   - `versions/<YYYY.MM.DD-commit>/node.exe` + `index.js`
   *
   * Spawning via agent.cmd creates a problematic nesting chain:
   *   PowerShell → agent.cmd → PowerShell → cursor-agent.ps1 → node.exe
   * This chain hangs on Windows CI runners. Direct invocation bypasses it.
   *
   * @returns `{ nodePath, indexPath }` or `undefined` if not found
   */
  private resolveCursorBinary(): { nodePath: string; indexPath: string } | undefined {
    const localAppData = process.env.LOCALAPPDATA;
    if (!localAppData) {
      this.log('[diag] resolveCursorBinary: LOCALAPPDATA not set');
      return undefined;
    }

    const versionsDir = join(localAppData, 'cursor-agent', 'versions');
    if (!existsSync(versionsDir)) {
      this.log(`[diag] resolveCursorBinary: versions dir not found: ${versionsDir}`);
      return undefined;
    }

    // Find the latest version directory (format: YYYY.MM.DD-commit)
    const versionPattern = /^\d{4}\.\d{1,2}\.\d{1,2}-[a-f0-9]+$/;
    const versions = readdirSync(versionsDir)
      .filter((d) => versionPattern.test(d))
      .sort()
      .reverse();

    if (versions.length === 0) {
      this.log(`[diag] resolveCursorBinary: no version dirs in ${versionsDir}`);
      return undefined;
    }

    const versionDir = join(versionsDir, versions[0]);
    const nodePath = join(versionDir, 'node.exe');
    const indexPath = join(versionDir, 'index.js');

    if (!existsSync(nodePath) || !existsSync(indexPath)) {
      this.log(
        `[diag] resolveCursorBinary: missing binary — node=${existsSync(nodePath)}, index=${existsSync(indexPath)}`
      );
      return undefined;
    }

    this.log(`[diag] resolveCursorBinary: resolved version=${versions[0]}`);
    return { nodePath, indexPath };
  }

  /**
   * Spawn the agent process, handling Windows specially.
   *
   * On Windows, the cursor CLI ships as `agent.cmd` which spawns PowerShell
   * which runs `cursor-agent.ps1` which runs `node.exe index.js`. This triple
   * nesting (PowerShell → cmd.exe → PowerShell → node.exe) hangs on Windows
   * CI runners. Solution: resolve the cursor CLI's bundled `node.exe` and
   * `index.js` directly, bypassing all shell wrappers.
   *
   * On Linux/macOS, spawn `agent` directly — no shell needed.
   */
  /**
   * Build the subprocess environment: strip CLAUDECODE, inject CURSOR_API_KEY
   * from authConfig when token auth is configured.
   */
  private buildEnv(extra?: Record<string, string>): Record<string, string | undefined> {
    const { CLAUDECODE: _, ...cleanEnv } = process.env;

    // Inject CURSOR_API_KEY from stored settings so the cursor CLI authenticates
    // even when the env var isn't inherited (e.g. direct node.exe invocation on Windows).
    if (this.authConfig?.authMethod === 'token' && this.authConfig.token) {
      cleanEnv.CURSOR_API_KEY = this.authConfig.token;
      this.log(
        `[diag] buildEnv: injected CURSOR_API_KEY from authConfig (${this.authConfig.token.length} chars)`
      );
    } else {
      this.log(
        `[diag] buildEnv: NO token injection (authMethod=${this.authConfig?.authMethod ?? 'none'}, hasToken=${!!this.authConfig?.token}, envKey=${!!cleanEnv.CURSOR_API_KEY})`
      );
    }

    const env = extra ? { ...cleanEnv, ...extra } : cleanEnv;
    this.log(
      `[diag] buildEnv: final CURSOR_API_KEY in env=${!!env.CURSOR_API_KEY}, len=${(env.CURSOR_API_KEY as string)?.length ?? 0}`
    );
    return env;
  }

  private spawnAgent(
    prompt: string,
    args: string[],
    options?: AgentExecutionOptions
  ): { proc: ReturnType<SpawnFunction>; tmpFile: string | undefined } {
    const cwd = options?.cwd;

    if (IS_WINDOWS) {
      // Direct invocation: resolve cursor's bundled node.exe + index.js and
      // spawn directly. This bypasses agent.cmd/PowerShell which can trigger
      // GUI "Open with" dialogs on Windows when `agent` isn't on PATH.
      const resolved = this.resolveCursorBinary();
      if (resolved) {
        const directArgs = [resolved.indexPath, ...args];

        this.log(`Windows direct mode: ${resolved.nodePath}`);
        this.log(
          `Args: ${directArgs.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
        );

        const proc = this.spawn(resolved.nodePath, directArgs, {
          cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          env: this.buildEnv({ CURSOR_INVOKED_AS: 'agent' }),
        });
        this.log(`Direct PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);
        if (proc.stdin) proc.stdin.end();

        return { proc, tmpFile: undefined };
      }

      // Fallback: PowerShell + temp file with FULL path to agent.cmd
      // (bare `agent` triggers Windows "Open with" dialog)
      const agentCmd = join(process.env.LOCALAPPDATA ?? '', 'cursor-agent', 'agent.cmd');
      this.log(`[diag] Windows fallback: using PowerShell + ${agentCmd}`);
      const tmpFile = join(
        tmpdir(),
        `shep-cursor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.txt`
      );
      writeFileSync(tmpFile, prompt, 'utf8');

      const agentFlags = args.filter((a) => a !== '-p' && a !== prompt).join(' ');
      const safePath = tmpFile.replace(/'/g, "''");
      const agentPath = agentCmd.replace(/'/g, "''");
      const psCmd = `$p = Get-Content -Raw '${safePath}'; & '${agentPath}' ${agentFlags} -p $p`;

      this.log(`[diag] PS command: ${psCmd.replace(prompt, `<${prompt.length} chars>`)}`);
      const proc = this.spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psCmd],
        {
          cwd,
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
          env: this.buildEnv(),
        }
      );
      this.log(`[diag] PowerShell PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);
      if (proc.stdin) proc.stdin.end();

      return { proc, tmpFile };
    }

    // Linux/macOS: spawn agent directly, no shell needed
    const spawnOpts: Record<string, unknown> = {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: this.buildEnv(),
    };
    if (cwd) spawnOpts.cwd = cwd;

    this.log(
      `Spawning: agent ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(' ')}`
    );
    this.log(`Spawn cwd: ${(cwd as string) ?? '(inherited)'}`);

    const proc = this.spawn('agent', args, spawnOpts);
    this.log(`Subprocess PID: ${proc.pid ?? 'undefined (spawn may have failed)'}`);
    if (proc.stdin) proc.stdin.end();

    return { proc, tmpFile: undefined };
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
