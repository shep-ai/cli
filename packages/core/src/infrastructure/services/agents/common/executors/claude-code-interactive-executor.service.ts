/**
 * Claude Code Interactive Executor Service
 *
 * Infrastructure implementation of IInteractiveAgentExecutor using the
 * @anthropic-ai/claude-agent-sdk V2 session API. This is the ONLY file
 * that imports from the SDK.
 *
 * Design decisions:
 * - The CLAUDECODE env var is stripped to prevent nested-session detection
 *   errors when shep itself is running inside a Claude Code session.
 * - SDK message types are mapped to our own InteractiveAgentEvent to
 *   keep the application layer decoupled from SDK specifics.
 */

import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
} from '@anthropic-ai/claude-agent-sdk';
import type { SDKSession, SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type {
  IInteractiveAgentExecutor,
  InteractiveAgentOptions,
  InteractiveAgentSessionHandle,
  InteractiveAgentEvent,
} from '../../../../../application/ports/output/agents/interactive-agent-executor.interface.js';

/** Default model used when options.model is not specified. */
const DEFAULT_MODEL = 'claude-sonnet-4-6';

export class ClaudeCodeInteractiveExecutor implements IInteractiveAgentExecutor {
  async createSession(options: InteractiveAgentOptions): Promise<InteractiveAgentSessionHandle> {
    const sdkSession = this.withCwd(options.cwd, () =>
      unstable_v2_createSession(this.buildSdkOptions(options))
    );
    return this.wrapSession(sdkSession);
  }

  async resumeSession(
    sessionId: string,
    options: InteractiveAgentOptions
  ): Promise<InteractiveAgentSessionHandle> {
    const sdkSession = this.withCwd(options.cwd, () =>
      unstable_v2_resumeSession(sessionId, this.buildSdkOptions(options))
    );
    return this.wrapSession(sdkSession);
  }

  /**
   * SDKSessionOptions (V2) does not support a `cwd` parameter.
   * Temporarily change process.cwd() for session creation, then restore.
   * This is safe because Node.js is single-threaded and SDK session creation
   * is synchronous (returns immediately, spawns process in background).
   */
  private withCwd<T>(cwd: string, fn: () => T): T {
    const originalCwd = process.cwd();
    try {
      process.chdir(cwd);
      return fn();
    } finally {
      process.chdir(originalCwd);
    }
  }

  private buildSdkOptions(options: InteractiveAgentOptions) {
    // Strip CLAUDECODE env var to prevent nested-session detection errors.
    const { CLAUDECODE: _, ...cleanEnv } = process.env;
    return {
      model: options.model ?? DEFAULT_MODEL,
      permissionMode: 'bypassPermissions' as const,
      env: cleanEnv,
    };
  }

  private wrapSession(sdkSession: SDKSession): InteractiveAgentSessionHandle {
    return {
      get sessionId() {
        // SDK session ID is not available until after the first message exchange.
        // Return empty string before that — callers should read it after streaming.
        try {
          return sdkSession.sessionId;
        } catch {
          return '';
        }
      },
      send: (message: string) => sdkSession.send(message),
      stream: () => this.mapStream(sdkSession),
      close: async () => sdkSession.close(),
    };
  }

  private async *mapStream(sdkSession: SDKSession): AsyncIterable<InteractiveAgentEvent> {
    for await (const msg of sdkSession.stream()) {
      const events = this.mapSdkMessage(msg);
      for (const event of events) {
        yield event;
      }
    }
  }

  /**
   * Map a single SDK message to zero or more InteractiveAgentEvents.
   *
   * SDK message types we handle:
   * - stream_event (SDKPartialAssistantMessage): streaming content deltas
   * - assistant (SDKAssistantMessage): complete assistant turn with tool_use blocks
   * - result (SDKResultMessage): success or error result
   * - system (SDKStatusMessage / SDKSystemMessage): status updates
   * - tool_use_summary: tool execution summaries
   * - tool_progress: tool execution progress
   *
   * Other message types are silently ignored (user replays, auth, etc.)
   */
  private mapSdkMessage(msg: SDKMessage): InteractiveAgentEvent[] {
    const events: InteractiveAgentEvent[] = [];

    switch (msg.type) {
      case 'stream_event': {
        // SDKPartialAssistantMessage — streaming content delta
        const evt = msg.event;
        if (
          evt.type === 'content_block_delta' &&
          'delta' in evt &&
          evt.delta.type === 'text_delta' &&
          'text' in evt.delta
        ) {
          events.push({
            type: 'delta',
            content: evt.delta.text,
          });
        }
        break;
      }

      case 'assistant': {
        // SDKAssistantMessage — complete assistant turn with text + tool_use blocks.
        // Text blocks contain the agent's reasoning between tool calls (e.g.,
        // "Let me read that file..." or "I see, now I'll..."). These MUST be
        // emitted as deltas — stream_event deltas may not be available in V2.
        if ('message' in msg && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === 'text' && block.text) {
              events.push({
                type: 'delta',
                content: block.text,
              });
            } else if (block.type === 'tool_use') {
              events.push({
                type: 'tool_use',
                label: block.name,
                detail: JSON.stringify(block.input ?? {}),
              });
            }
          }
        }

        // If the assistant message contains an error, emit it
        if ('error' in msg && msg.error) {
          events.push({
            type: 'error',
            content: String(msg.error),
          });
        }
        break;
      }

      case 'result': {
        // SDKResultMessage — success or error
        if (msg.subtype === 'success') {
          events.push({
            type: 'done',
            content: msg.result,
            usage: {
              costUsd: msg.total_cost_usd,
              inputTokens: msg.usage?.input_tokens,
              outputTokens: msg.usage?.output_tokens,
              numTurns: msg.num_turns,
              durationMs: msg.duration_ms,
            },
          });
        } else {
          // SDKResultError
          const errorMsg =
            'errors' in msg && Array.isArray(msg.errors) ? msg.errors.join('; ') : msg.subtype;
          events.push({
            type: 'error',
            content: errorMsg,
          });
        }
        break;
      }

      case 'system': {
        if (!('subtype' in msg)) break;
        switch (msg.subtype) {
          case 'init':
            // Session initialized — model, tools, version
            if ('model' in msg) {
              const tools = 'tools' in msg && Array.isArray(msg.tools) ? msg.tools : [];
              const version = 'claude_code_version' in msg ? String(msg.claude_code_version) : '';
              events.push({
                type: 'init',
                label: String(msg.model),
                detail: `${tools.length} tools`,
                content: version ? `v${version}` : undefined,
              });
            }
            break;
          case 'status':
            if ('status' in msg) {
              events.push({
                type: 'status',
                content: String(msg.status ?? 'ready'),
              });
            }
            break;
          case 'api_retry':
            // API retry — let user know agent is retrying
            if ('attempt' in msg) {
              const attempt = (msg as { attempt: number }).attempt;
              const maxRetries =
                'max_retries' in msg ? (msg as { max_retries: number }).max_retries : '?';
              const delayMs =
                'retry_delay_ms' in msg ? (msg as { retry_delay_ms: number }).retry_delay_ms : 0;
              const delaySec = Math.round(delayMs / 1000);
              events.push({
                type: 'api_retry',
                content: `Retrying API call (attempt ${attempt}/${maxRetries})${delaySec > 0 ? `, waiting ${delaySec}s` : ''}`,
              });
            }
            break;
          case 'task_started':
            if ('description' in msg && 'task_id' in msg) {
              events.push({
                type: 'task_started',
                label: String((msg as { task_id: string }).task_id),
                content: String((msg as { description: string }).description),
              });
            }
            break;
          case 'task_progress':
            if ('description' in msg && 'task_id' in msg) {
              events.push({
                type: 'task_progress',
                label: String((msg as { task_id: string }).task_id),
                content: String((msg as { description: string }).description),
              });
            }
            break;
          case 'task_notification':
            if ('summary' in msg && 'task_id' in msg) {
              const status = 'status' in msg ? String((msg as { status: string }).status) : 'done';
              events.push({
                type: 'task_done',
                label: String((msg as { task_id: string }).task_id),
                content: String((msg as { summary: string }).summary),
                detail: status,
              });
            }
            break;
        }
        break;
      }

      case 'rate_limit_event': {
        if ('rate_limit_info' in msg) {
          const info = msg.rate_limit_info;
          const status = info.status;
          if (status === 'rejected') {
            const resetsAt = info.resetsAt ? new Date(info.resetsAt).toLocaleTimeString() : 'soon';
            events.push({
              type: 'rate_limit',
              content: `Rate limited — resets at ${resetsAt}`,
            });
          } else if (status === 'allowed_warning') {
            const pct = info.utilization ? `${Math.round(info.utilization * 100)}%` : '';
            events.push({
              type: 'rate_limit',
              content: `Rate limit warning${pct ? ` (${pct} used)` : ''}`,
            });
          }
        }
        break;
      }

      case 'tool_use_summary': {
        if ('summary' in msg) {
          events.push({
            type: 'tool_result',
            content: msg.summary,
          });
        }
        break;
      }

      case 'tool_progress': {
        if ('tool_name' in msg) {
          events.push({
            type: 'status',
            label: msg.tool_name,
            content: `Running ${msg.tool_name}...`,
          });
        }
        break;
      }

      default:
        // Ignore: user, user_replay, auth_status, compact_boundary,
        // local_command_output, hook_*, files_persisted,
        // elicitation_complete, prompt_suggestion
        break;
    }

    return events;
  }
}
