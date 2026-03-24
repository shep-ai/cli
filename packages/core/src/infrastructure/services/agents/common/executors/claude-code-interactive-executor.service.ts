/**
 * Claude Code Interactive Executor Service
 *
 * Infrastructure implementation of IInteractiveAgentExecutor using the
 * @anthropic-ai/claude-agent-sdk V2 session API. This is the ONLY file
 * (alongside claude-agent-sdk.adapter.ts) that imports from the SDK.
 *
 * Design decisions:
 * - SDKSessionOptions (V2) does not expose a `cwd` parameter. We use
 *   process.chdir() before session creation so the embedded Claude Code
 *   process inherits the correct working directory. This is safe in the
 *   single-threaded Node.js event loop where session creation is sequential.
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
    // V2 SDKSessionOptions does not accept a cwd parameter directly.
    // Use process.chdir() so the embedded Claude Code process inherits the
    // correct working directory. Safe in Node.js single-threaded context.
    process.chdir(options.cwd);

    const sdkSession = unstable_v2_createSession({
      model: options.model ?? DEFAULT_MODEL,
      permissionMode: 'bypassPermissions',
      // Strip CLAUDECODE env var to prevent nested-session detection errors.
      env: { ...process.env, CLAUDECODE: undefined },
    });

    return this.wrapSession(sdkSession);
  }

  async resumeSession(
    sessionId: string,
    options: InteractiveAgentOptions
  ): Promise<InteractiveAgentSessionHandle> {
    // Apply cwd before resuming for the same reason as createSession.
    process.chdir(options.cwd);

    const sdkSession = unstable_v2_resumeSession(sessionId, {
      model: options.model ?? DEFAULT_MODEL,
      permissionMode: 'bypassPermissions',
      // Strip CLAUDECODE env var to prevent nested-session detection errors.
      env: { ...process.env, CLAUDECODE: undefined },
    });

    return this.wrapSession(sdkSession);
  }

  private wrapSession(sdkSession: SDKSession): InteractiveAgentSessionHandle {
    return {
      get sessionId() {
        return sdkSession.sessionId;
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
        // SDKAssistantMessage — complete assistant turn
        if ('message' in msg && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === 'tool_use') {
              events.push({
                type: 'tool_use',
                label: block.name,
                detail: JSON.stringify(block.input ?? {}),
              });
            }
            // We don't emit full text blocks here — they were already streamed
            // via stream_event deltas. If partial messages are disabled, we
            // could emit them here, but our default path uses streaming.
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
        // SDKStatusMessage or SDKSystemMessage
        if ('subtype' in msg) {
          if (msg.subtype === 'status' && 'status' in msg) {
            events.push({
              type: 'status',
              content: String(msg.status ?? 'ready'),
            });
          }
          // 'init' subtype: could emit a status event if useful, but
          // typically not needed by callers.
        }
        break;
      }

      case 'tool_use_summary': {
        // SDKToolUseSummaryMessage
        if ('summary' in msg) {
          events.push({
            type: 'tool_result',
            content: msg.summary,
          });
        }
        break;
      }

      case 'tool_progress': {
        // SDKToolProgressMessage
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
        // Ignore other message types (user, user_replay, auth_status,
        // compact_boundary, api_retry, local_command_output, hook_*,
        // task_notification, task_started, task_progress, files_persisted,
        // rate_limit, elicitation_complete, prompt_suggestion)
        break;
    }

    return events;
  }
}
