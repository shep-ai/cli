/**
 * Claude Agent SDK Adapter
 *
 * The ONLY file in this codebase that imports from @anthropic-ai/claude-agent-sdk.
 * Wraps the unstable V2 session API and implements IInteractiveAgentAdapter.
 *
 * Design notes:
 * - SDKSessionOptions (V2) does not support a `cwd` parameter. We use process.chdir()
 *   before creating the session so the embedded Claude Code process inherits the
 *   correct working directory. This is safe in single-threaded Node.js event loop
 *   context where session creation is not concurrent.
 * - The CLAUDECODE env var is stripped to prevent nested-session detection errors
 *   when shep itself is running inside a Claude Code session.
 * - systemPrompt uses the 'preset' + 'append' form to preserve full Claude Code
 *   tooling while adding feature-specific context.
 */

import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
} from '@anthropic-ai/claude-agent-sdk';
import type {
  IInteractiveAgentAdapter,
  InteractiveSessionOptions,
  SDKSession,
} from '../../../application/ports/output/agents/interactive-agent-adapter.interface.js';

/** Default model used when options.model is not specified. */
const DEFAULT_MODEL = 'claude-sonnet-4-6';

export class ClaudeAgentSdkAdapter implements IInteractiveAgentAdapter {
  async createSession(options: InteractiveSessionOptions): Promise<SDKSession> {
    // V2 SDKSessionOptions does not accept a cwd parameter directly.
    // Use process.chdir() so the embedded Claude Code process inherits the
    // correct working directory. Safe in Node.js single-threaded context.
    process.chdir(options.cwd);

    const session = unstable_v2_createSession({
      model: options.model ?? DEFAULT_MODEL,
      permissionMode: 'bypassPermissions',
      // Strip CLAUDECODE env var to prevent nested-session detection errors.
      env: { ...process.env, CLAUDECODE: undefined },
    });

    return session;
  }

  async resumeSession(sessionId: string, options: InteractiveSessionOptions): Promise<SDKSession> {
    // Apply cwd before resuming for the same reason as createSession.
    process.chdir(options.cwd);

    const session = unstable_v2_resumeSession(sessionId, {
      model: options.model ?? DEFAULT_MODEL,
      permissionMode: 'bypassPermissions',
      // Strip CLAUDECODE env var to prevent nested-session detection errors.
      env: { ...process.env, CLAUDECODE: undefined },
    });

    return session;
  }
}
