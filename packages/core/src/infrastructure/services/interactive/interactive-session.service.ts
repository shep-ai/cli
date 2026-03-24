/**
 * Interactive Session Service
 *
 * Singleton service that owns the lifecycle of all interactive agent sessions.
 * Uses the IAgentExecutorFactory to create interactive executors that manage
 * persistent sessions via the agent SDK. Multi-turn context is maintained
 * by the SDK session handle internally.
 *
 * Dependencies are injected via constructor for testability (no real processes
 * are spawned in unit tests — the factory is replaced with a test double).
 */

import * as crypto from 'node:crypto';
import type {
  IInteractiveSessionService,
  StreamChunk,
  UnsubscribeFn,
  ChatState,
} from '../../../application/ports/output/services/interactive-session-service.interface.js';
import type { IInteractiveSessionRepository } from '../../../application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '../../../application/ports/output/repositories/interactive-message-repository.interface.js';
import type { IAgentExecutorFactory } from '../../../application/ports/output/agents/agent-executor-factory.interface.js';
import type { InteractiveAgentSessionHandle } from '../../../application/ports/output/agents/interactive-agent-executor.interface.js';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface.js';
import type { InteractiveSession, InteractiveMessage } from '../../../domain/generated/output.js';
import {
  InteractiveSessionStatus,
  InteractiveMessageRole,
  AgentType,
  AgentAuthMethod,
} from '../../../domain/generated/output.js';
import type { AgentConfig } from '../../../domain/generated/output.js';
import { ConcurrentSessionLimitError } from '../../../domain/errors/concurrent-session-limit.error.js';
import { type FeatureContextBuilder } from './feature-context.builder.js';
import { getSettings, hasSettings } from '../settings.service.js';

/** Default idle timeout if no settings are loaded (15 minutes). */
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

/** Default concurrent session cap. */
const DEFAULT_CAP = 3;

/** Maximum time to wait for the agent to become ready (60 seconds). */
const BOOT_TIMEOUT_MS = 60_000;

/** In-memory state for a single live session. */
interface SessionState {
  sessionId: string;
  featureId: string;
  worktreePath: string;
  /** Agent SDK session handle — null until session is created. */
  handle: InteractiveAgentSessionHandle | null;
  /** Claude SDK session ID for resumption across service restarts. */
  claudeSessionId?: string;
  timer: NodeJS.Timeout | null;
  /** Accumulates assistant text between user turns for persistence. */
  currentAssistantBuffer: string;
  /** Accumulates tool events during a turn for rich message persistence. */
  toolEventsLog: string[];
  /** Subscriber callbacks for real-time stdout chunk forwarding. */
  subscribers: Set<(chunk: StreamChunk) => void>;
  /** User message content queued while session boots. */
  pendingUserContent?: string;
  /** Model override for the agent process (e.g. 'claude-sonnet-4-6'). */
  model?: string;
  /** Agent type for this session. */
  agentType?: string;
  /** AbortController to cancel active stream iteration on stop. */
  streamAbort?: AbortController;
}

/**
 * Core service managing interactive agent session lifecycles.
 * Must be registered as a singleton in the DI container.
 *
 * **Polymorphic `featureId` scope key:** The `featureId` parameter accepted
 * by public methods (`sendUserMessage`, `getChatState`, `subscribeByFeature`,
 * etc.) is a polymorphic scope key — not necessarily a feature UUID:
 * - Feature chat: actual feature UUID (e.g. `"feat-abc123"`)
 * - Repository chat: repo identifier (e.g. `"repo-<repoId>"`)
 * - Global chat: literal string `"global"`
 *
 * Sessions and messages are isolated by this key regardless of chat type.
 *
 * @todo Consider renaming to `scopeId` + adding a `scopeType` discriminator.
 */
export class InteractiveSessionService implements IInteractiveSessionService {
  /** Live sessions indexed by sessionId. */
  private sessions = new Map<string, SessionState>();
  /** Cached claudeSessionIds from stopped sessions, keyed by featureId. */
  private stoppedClaudeSessionIds = new Map<string, string>();

  constructor(
    private readonly sessionRepo: IInteractiveSessionRepository,
    private readonly messageRepo: IInteractiveMessageRepository,
    private readonly executorFactory: IAgentExecutorFactory,
    private readonly featureRepo: IFeatureRepository,
    private readonly contextBuilder: FeatureContextBuilder
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async startSession(
    featureId: string,
    worktreePath: string,
    model?: string,
    agentType?: string
  ): Promise<InteractiveSession> {
    const cap = this.getCap();
    const activeCount = await this.sessionRepo.countActiveSessions();
    if (activeCount >= cap) {
      throw new ConcurrentSessionLimitError(activeCount, cap);
    }

    // Create DB record with booting status
    const now = new Date();
    const session: InteractiveSession = {
      id: crypto.randomUUID(),
      featureId,
      status: InteractiveSessionStatus.booting,
      startedAt: now,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.sessionRepo.create(session);

    // Carry over claudeSessionId from previous session so resumption works
    let previousClaudeSessionId: string | undefined;
    for (const [, s] of this.sessions) {
      if (s.featureId === featureId && s.claudeSessionId) {
        previousClaudeSessionId = s.claudeSessionId;
        break;
      }
    }
    // Also check stoppedSessions cache (populated on stop)
    previousClaudeSessionId ??= this.stoppedClaudeSessionIds.get(featureId);

    // Set up in-memory state
    const state: SessionState = {
      sessionId: session.id,
      featureId,
      worktreePath,
      model,
      agentType,
      handle: null,
      claudeSessionId: previousClaudeSessionId,
      timer: null,
      currentAssistantBuffer: '',
      toolEventsLog: [],
      subscribers: new Set(),
    };
    this.sessions.set(session.id, state);

    // Fire-and-forget the async boot sequence. The API returns the session
    // immediately in "booting" status; the frontend polls until "ready".
    void this.completeBootAsync(state, featureId, worktreePath);

    return session;
  }

  /**
   * Asynchronously complete the boot sequence: build feature context,
   * create an SDK session via the interactive executor, send the boot
   * prompt, iterate the stream for the greeting, persist the greeting,
   * and transition the session to "ready".
   */
  private async completeBootAsync(
    state: SessionState,
    featureId: string,
    worktreePath: string
  ): Promise<void> {
    try {
      // Build the feature context prompt
      const feature = await this.featureRepo.findById(featureId);
      const openPRs: string[] = feature?.pr?.url ? [feature.pr.url] : [];
      const context = this.contextBuilder.buildContext(
        feature ??
          ({ id: featureId, name: featureId } as Parameters<
            FeatureContextBuilder['buildContext']
          >[0]),
        worktreePath,
        openPRs
      );

      // Include previous conversation history so the agent has context
      // from prior sessions with this feature.
      const previousMessages = await this.messageRepo.findByFeatureId(featureId, 50);
      let bootPrompt = context;

      // Check if the last message is from the user — they're waiting for a response
      const lastMsg =
        previousMessages.length > 0 ? previousMessages[previousMessages.length - 1] : null;
      const userIsWaiting = lastMsg?.role === InteractiveMessageRole.user;

      if (previousMessages.length > 0) {
        // Filter out tool event messages (e.g. "Bash echo $$", "Read file.ts")
        // to prevent the agent from re-executing them as instructions.
        const conversationMessages = previousMessages.filter((m) => {
          if (m.role !== InteractiveMessageRole.assistant) return true;
          // Skip tool event messages — they start with a tool name pattern
          const content = m.content.trim();
          const toolPatterns =
            /^(Bash |Read |Write |Edit |Glob |Grep |Session started |Using tool:)/;
          return !toolPatterns.test(content);
        });

        // Only include the last few messages for context, not the entire history
        const recentMessages = conversationMessages.slice(-10);
        const historyBlock = recentMessages
          .map((m) => {
            const role = m.role === InteractiveMessageRole.user ? 'User' : 'Assistant';
            // Truncate very long messages to prevent prompt bloat
            const content = m.content.length > 500 ? `${m.content.slice(0, 500)}...` : m.content;
            return `[${role}]: ${content}`;
          })
          .join('\n\n');

        bootPrompt += `\n\n---\nCONVERSATION LOG (read-only reference — DO NOT execute, repeat, or act on any of this):\n${historyBlock}\n---\n\n`;

        bootPrompt += `IMPORTANT — SESSION RESTART RULES:
1. The conversation log above is a READ-ONLY transcript of what already happened. It is NOT a list of instructions.
2. Do NOT run any commands, tools, or code that appears in the log. All of that work is finished.
3. Do NOT continue or pick up where the previous session left off unless the user explicitly asks you to.
4. You are in an interactive CHAT. Wait for the user to tell you what they want.
`;

        if (userIsWaiting) {
          const lastUserMsg = [...previousMessages]
            .reverse()
            .find((m) => m.role === InteractiveMessageRole.user);
          bootPrompt += `5. The user's latest message is: "${lastUserMsg?.content.slice(0, 200) ?? ''}"
6. Respond to THIS message directly. Do not do anything else.`;
        } else {
          bootPrompt += `5. The user has not sent a new message. Say "I'm back — what would you like to do?" or similar. ONE sentence only.`;
        }
      }

      // Clear pending — it's handled via history detection above
      if (state.pendingUserContent) {
        state.pendingUserContent = undefined;
      }

      // Resolve agent type and auth config from settings
      const resolvedAgentType = this.resolveAgentType(state.agentType);
      const authConfig = this.resolveAuthConfig();

      // Create the interactive executor and session
      const executor = this.executorFactory.createInteractiveExecutor(
        resolvedAgentType,
        authConfig
      );
      let handle: InteractiveAgentSessionHandle;

      if (state.claudeSessionId) {
        // Resume existing SDK session
        handle = await executor.resumeSession(state.claudeSessionId, {
          cwd: worktreePath,
          model: state.model,
          systemPrompt: context,
        });
      } else {
        // Create new SDK session
        handle = await executor.createSession({
          cwd: worktreePath,
          model: state.model,
          systemPrompt: context,
        });
      }

      state.handle = handle;
      state.claudeSessionId = handle.sessionId;

      // Send the boot prompt and iterate stream for the greeting
      await handle.send(bootPrompt);

      let greetingText = '';
      const bootAbort = new AbortController();
      state.streamAbort = bootAbort;

      // Set up boot timeout
      const bootTimeout = setTimeout(() => {
        bootAbort.abort();
      }, BOOT_TIMEOUT_MS);

      try {
        for await (const event of handle.stream()) {
          if (bootAbort.signal.aborted) {
            throw new Error(`Agent boot timed out after ${BOOT_TIMEOUT_MS / 1000}s`);
          }

          this.resetTimer(state);

          switch (event.type) {
            case 'delta':
              if (event.content) {
                greetingText += event.content;
                state.currentAssistantBuffer += event.content;
                state.subscribers.forEach((sub) => sub({ delta: event.content!, done: false }));
              }
              break;

            case 'tool_use':
              if (event.label) {
                const toolLabel = event.label;
                const toolDetail = event.detail;
                void this.persistToolEvent(state, toolLabel, toolDetail);
                state.subscribers.forEach((sub) =>
                  sub({
                    delta: '',
                    done: false,
                    log: `Using tool: ${toolLabel}`,
                    activity: { kind: 'tool_use', label: toolLabel, detail: toolDetail },
                  })
                );
              }
              break;

            case 'tool_result':
              if (event.label) {
                const resultLabel = event.label;
                const resultDetail = event.detail;
                void this.persistToolEvent(state, resultLabel, resultDetail);
                state.subscribers.forEach((sub) =>
                  sub({
                    delta: '',
                    done: false,
                    log: `Completed: ${resultLabel}`,
                    activity: { kind: 'tool_result', label: resultLabel, detail: resultDetail },
                  })
                );
              }
              break;

            case 'status':
              if (event.content) {
                const statusContent = event.content;
                state.subscribers.forEach((sub) =>
                  sub({ delta: '', done: false, log: statusContent })
                );
              }
              break;

            case 'done': {
              // Use result text if provided and non-empty, otherwise use accumulated buffer
              const resultText =
                event.content && event.content.length > 0 ? event.content : greetingText;

              // Persist greeting and mark session ready
              const greetingMsg: InteractiveMessage = {
                id: crypto.randomUUID(),
                featureId,
                sessionId: state.sessionId,
                role: InteractiveMessageRole.assistant,
                content: resultText,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              await this.messageRepo.create(greetingMsg);
              await this.sessionRepo.updateStatus(state.sessionId, InteractiveSessionStatus.ready);

              state.currentAssistantBuffer = '';
              state.toolEventsLog = [];

              // Notify subscribers of end-of-turn
              state.subscribers.forEach((sub) => sub({ delta: '', done: true }));

              // Start idle timer now that the session is live
              this.resetTimer(state);
              return; // Boot complete
            }

            case 'error':
              throw new Error(`Agent error during boot: ${event.content ?? 'unknown'}`);
          }
        }
      } finally {
        clearTimeout(bootTimeout);
        state.streamAbort = undefined;
      }

      // If we get here without a 'done' event, use whatever text we accumulated
      if (greetingText) {
        const greetingMsg: InteractiveMessage = {
          id: crypto.randomUUID(),
          featureId,
          sessionId: state.sessionId,
          role: InteractiveMessageRole.assistant,
          content: greetingText,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await this.messageRepo.create(greetingMsg);
      }
      await this.sessionRepo.updateStatus(state.sessionId, InteractiveSessionStatus.ready);
      state.currentAssistantBuffer = '';
      state.toolEventsLog = [];
      this.resetTimer(state);
    } catch (err) {
      // If session was already cleaned up by stopSession, nothing more to do
      if (!this.sessions.has(state.sessionId)) return;

      // Boot failed — mark session as error so the frontend can show the failure
      // eslint-disable-next-line no-console
      console.error(`[InteractiveSession] boot failed for session ${state.sessionId}:`, err);
      try {
        await this.sessionRepo.updateStatus(state.sessionId, InteractiveSessionStatus.error);
      } catch {
        // Best-effort DB update
      }
      if (state.claudeSessionId) {
        this.stoppedClaudeSessionIds.set(state.featureId, state.claudeSessionId);
      }
      this.sessions.delete(state.sessionId);
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      // Already stopped — idempotent
      return;
    }

    // eslint-disable-next-line no-console
    console.log(
      `[InteractiveSession] stopSession called for ${sessionId} (feature: ${state.featureId})`,
      new Error().stack?.split('\n').slice(1, 4).join(' <- ')
    );

    // Abort any active stream iteration
    if (state.streamAbort) {
      state.streamAbort.abort();
      state.streamAbort = undefined;
    }

    this.clearTimer(state);
    // Cache claudeSessionId so resumption works when session restarts
    if (state.claudeSessionId) {
      this.stoppedClaudeSessionIds.set(state.featureId, state.claudeSessionId);
    }
    this.sessions.delete(sessionId);

    // Close the SDK session handle
    if (state.handle) {
      try {
        await state.handle.close();
      } catch {
        // Session may already be closed
      }
      state.handle = null;
    }

    await this.sessionRepo.updateStatus(sessionId, InteractiveSessionStatus.stopped, new Date());
  }

  async sendMessage(sessionId: string, content: string): Promise<InteractiveMessage> {
    const dbSession = await this.sessionRepo.findById(sessionId);
    if (!dbSession || dbSession.status !== InteractiveSessionStatus.ready) {
      throw new Error(`Session ${sessionId} is not ready — cannot send message`);
    }

    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} is not ready — cannot send message`);
    }

    // Persist user message
    const now = new Date();
    const message: InteractiveMessage = {
      id: crypto.randomUUID(),
      featureId: state.featureId,
      sessionId,
      role: InteractiveMessageRole.user,
      content,
      createdAt: now,
      updatedAt: now,
    };
    await this.messageRepo.create(message);

    // Reset idle timer on user activity
    this.resetTimer(state);
    await this.sessionRepo.updateLastActivity(sessionId, now);

    // Execute turn via SDK handle — fire-and-forget, response streams to subscribers
    void this.executeAndPersistTurn(state, content);

    return message;
  }

  /**
   * Execute a turn via the SDK session handle and persist the assistant response.
   */
  private async executeAndPersistTurn(state: SessionState, prompt: string): Promise<void> {
    try {
      if (!state.handle) {
        throw new Error('No active session handle — cannot execute turn');
      }

      state.currentAssistantBuffer = '';
      state.toolEventsLog = [];

      // Send the message to the SDK session
      await state.handle.send(prompt);

      // Set up abort controller for this stream
      const abort = new AbortController();
      state.streamAbort = abort;

      let responseText = '';

      try {
        for await (const event of state.handle.stream()) {
          if (abort.signal.aborted) break;

          // Reset idle timer on each event received
          this.resetTimer(state);

          switch (event.type) {
            case 'delta':
              if (event.content) {
                responseText += event.content;
                state.currentAssistantBuffer += event.content;
                state.subscribers.forEach((sub) => sub({ delta: event.content!, done: false }));
              }
              break;

            case 'tool_use':
              if (event.label) {
                const toolLabel = event.label;
                const toolDetail = event.detail;
                void this.persistToolEvent(state, toolLabel, toolDetail);
                state.subscribers.forEach((sub) =>
                  sub({
                    delta: '',
                    done: false,
                    log: `Using tool: ${toolLabel}`,
                    activity: { kind: 'tool_use', label: toolLabel, detail: toolDetail },
                  })
                );
              }
              break;

            case 'tool_result':
              if (event.label) {
                const resultLabel = event.label;
                const resultDetail = event.detail;
                void this.persistToolEvent(state, resultLabel, resultDetail);
                state.subscribers.forEach((sub) =>
                  sub({
                    delta: '',
                    done: false,
                    log: `Completed: ${resultLabel}`,
                    activity: { kind: 'tool_result', label: resultLabel, detail: resultDetail },
                  })
                );
              }
              break;

            case 'status':
              if (event.content) {
                const statusContent = event.content;
                state.subscribers.forEach((sub) =>
                  sub({ delta: '', done: false, log: statusContent })
                );
              }
              break;

            case 'done': {
              // Use result text if provided and non-empty, otherwise use accumulated buffer
              const resultText =
                event.content && event.content.length > 0 ? event.content : responseText;

              // Persist assistant message
              const now = new Date();
              const msg: InteractiveMessage = {
                id: crypto.randomUUID(),
                featureId: state.featureId,
                sessionId: state.sessionId,
                role: InteractiveMessageRole.assistant,
                content: resultText,
                createdAt: now,
                updatedAt: now,
              };
              await this.messageRepo.create(msg);

              state.currentAssistantBuffer = '';
              state.toolEventsLog = [];

              // Notify subscribers of end-of-turn
              state.subscribers.forEach((sub) => sub({ delta: '', done: true }));
              return; // Turn complete
            }

            case 'error':
              // eslint-disable-next-line no-console
              console.error(
                `[InteractiveSession] agent error during turn for session ${state.sessionId}:`,
                event.content
              );
              state.subscribers.forEach((sub) =>
                sub({ delta: '', done: true, log: `Error: ${event.content ?? 'unknown'}` })
              );
              break;
          }
        }
      } finally {
        state.streamAbort = undefined;
      }

      // If we exit the stream loop without a 'done' event (stream ended),
      // persist whatever text we accumulated
      if (responseText && state.currentAssistantBuffer) {
        const now = new Date();
        const msg: InteractiveMessage = {
          id: crypto.randomUUID(),
          featureId: state.featureId,
          sessionId: state.sessionId,
          role: InteractiveMessageRole.assistant,
          content: responseText,
          createdAt: now,
          updatedAt: now,
        };
        await this.messageRepo.create(msg);

        state.currentAssistantBuffer = '';
        state.toolEventsLog = [];
        state.subscribers.forEach((sub) => sub({ delta: '', done: true }));
      }
    } catch (err) {
      // If session was already stopped, ignore
      if (!this.sessions.has(state.sessionId)) return;
      // eslint-disable-next-line no-console
      console.error(`[InteractiveSession] turn failed for session ${state.sessionId}:`, err);
    }
  }

  async getMessages(featureId: string, limit?: number): Promise<InteractiveMessage[]> {
    return this.messageRepo.findByFeatureId(featureId, limit);
  }

  async clearMessages(featureId: string): Promise<void> {
    // Stop any active session so the agent doesn't retain old context
    const state = this.findActiveStateForFeature(featureId);
    if (state) {
      await this.stopSession(state.sessionId);
    }
    // Also clear the cached claudeSessionId so next session starts fresh
    this.stoppedClaudeSessionIds.delete(featureId);
    return this.messageRepo.deleteByFeatureId(featureId);
  }

  async getSession(sessionId: string): Promise<InteractiveSession | null> {
    return this.sessionRepo.findById(sessionId);
  }

  subscribe(sessionId: string, onChunk: (chunk: StreamChunk) => void): UnsubscribeFn {
    const state = this.sessions.get(sessionId);
    if (!state) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
    state.subscribers.add(onChunk);
    return () => state.subscribers.delete(onChunk);
  }

  // ---------------------------------------------------------------------------
  // Feature-scoped API (frontend doesn't manage sessions)
  // ---------------------------------------------------------------------------

  async sendUserMessage(
    featureId: string,
    content: string,
    worktreePath: string
  ): Promise<InteractiveMessage> {
    // 1. Persist user message to DB immediately — this is the source of truth
    const now = new Date();
    const userMsg: InteractiveMessage = {
      id: crypto.randomUUID(),
      featureId,
      role: InteractiveMessageRole.user,
      content,
      createdAt: now,
      updatedAt: now,
    };
    await this.messageRepo.create(userMsg);

    // 2. Find active session for this feature
    const state = this.findActiveStateForFeature(featureId);

    if (state) {
      const dbSession = await this.sessionRepo.findById(state.sessionId);
      if (dbSession?.status === InteractiveSessionStatus.ready) {
        // Session ready — send to agent
        this.resetTimer(state);
        await this.sessionRepo.updateLastActivity(state.sessionId, now);
        void this.executeAndPersistTurn(state, content);
      } else if (dbSession?.status === InteractiveSessionStatus.booting) {
        // Session booting — queue the message
        state.pendingUserContent = content;
      }
    } else {
      // No active session — boot one and queue the message
      const session = await this.startSession(featureId, worktreePath);
      const newState = this.sessions.get(session.id);
      if (newState) {
        newState.pendingUserContent = content;
      }
    }

    return userMsg;
  }

  async getChatState(featureId: string): Promise<ChatState> {
    // DB messages
    const messages = await this.messageRepo.findByFeatureId(featureId);

    // Find active in-memory session
    const state = this.findActiveStateForFeature(featureId);
    let sessionStatus: string | null = null;
    let streamingText: string | null = null;
    let sessionInfo: ChatState['sessionInfo'] = null;

    if (state) {
      const dbSession = await this.sessionRepo.findById(state.sessionId);
      sessionStatus = dbSession?.status ?? null;
      if (state.currentAssistantBuffer) {
        streamingText = state.currentAssistantBuffer;
      }
      sessionInfo = {
        pid: null, // SDK manages process internally — we don't expose PID
        sessionId: state.handle?.sessionId ?? state.claudeSessionId ?? state.sessionId,
        model: state.model ?? null,
        startedAt: dbSession?.startedAt
          ? new Date(dbSession.startedAt as unknown as string).toISOString()
          : new Date().toISOString(),
        idleTimeoutMinutes: Math.round(this.getTimeoutMs() / 60_000),
        lastActivityAt: dbSession?.lastActivityAt
          ? new Date(dbSession.lastActivityAt as unknown as string).toISOString()
          : new Date().toISOString(),
      };
    } else {
      // No in-memory state — check DB for last session (e.g. after server restart / hot-reload)
      const latest = await this.sessionRepo.findByFeatureId(featureId);
      if (latest) {
        sessionStatus = latest.status as string;
        // Show DB info even without live process (process was lost on restart)
        if (
          latest.status !== InteractiveSessionStatus.stopped &&
          latest.status !== InteractiveSessionStatus.error
        ) {
          sessionInfo = {
            pid: null,
            sessionId: latest.id,
            model: null,
            startedAt: latest.startedAt
              ? new Date(latest.startedAt as unknown as string).toISOString()
              : new Date().toISOString(),
            idleTimeoutMinutes: Math.round(this.getTimeoutMs() / 60_000),
            lastActivityAt: latest.lastActivityAt
              ? new Date(latest.lastActivityAt as unknown as string).toISOString()
              : new Date().toISOString(),
          };
        }
      }
    }

    return { messages, sessionStatus, streamingText, sessionInfo };
  }

  subscribeByFeature(featureId: string, onChunk: (chunk: StreamChunk) => void): UnsubscribeFn {
    const state = this.findActiveStateForFeature(featureId);
    if (!state) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
    state.subscribers.add(onChunk);
    return () => state.subscribers.delete(onChunk);
  }

  async stopByFeature(featureId: string): Promise<void> {
    const state = this.findActiveStateForFeature(featureId);
    if (!state) return;
    // Persist a system message before killing
    const msg: InteractiveMessage = {
      id: crypto.randomUUID(),
      featureId,
      sessionId: state.sessionId,
      role: InteractiveMessageRole.assistant,
      content: '**Session stopped by user**',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.messageRepo.create(msg);
    await this.stopSession(state.sessionId);
  }

  /** Find the in-memory state for an active session for a feature. */
  private findActiveStateForFeature(featureId: string): SessionState | undefined {
    for (const state of this.sessions.values()) {
      if (state.featureId === featureId) return state;
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Agent resolution helpers
  // ---------------------------------------------------------------------------

  /** Resolve the agent type from an explicit override or settings. */
  private resolveAgentType(agentTypeOverride?: string): AgentType {
    if (agentTypeOverride) {
      return agentTypeOverride as AgentType;
    }
    if (hasSettings()) {
      return getSettings().agent.type;
    }
    return AgentType.ClaudeCode;
  }

  /** Resolve the auth config from settings, with a safe fallback. */
  private resolveAuthConfig(): AgentConfig {
    if (hasSettings()) {
      return getSettings().agent;
    }
    // Fallback for when settings haven't been initialized yet
    return {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
    };
  }

  // ---------------------------------------------------------------------------
  // Tool detail extraction
  // ---------------------------------------------------------------------------

  /**
   * Persist a tool/system event as its own assistant message in the DB.
   * Each event gets its own bubble in the chat thread.
   */
  private async persistToolEvent(
    state: SessionState,
    label: string,
    detail?: string
  ): Promise<void> {
    try {
      const content = detail ? `**${label}** \`${detail}\`` : `**${label}**`;
      const msg: InteractiveMessage = {
        id: crypto.randomUUID(),
        featureId: state.featureId,
        sessionId: state.sessionId,
        role: InteractiveMessageRole.assistant,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.messageRepo.create(msg);
    } catch {
      // Non-critical — don't fail the turn for a tool event
    }
  }

  /** Extract a human-readable detail string from tool input for display in chat. */
  private extractToolDetail(toolName: string, input?: Record<string, unknown>): string | undefined {
    if (!input) return undefined;
    if (toolName === 'Read' && input.file_path) return String(input.file_path);
    if (toolName === 'Write' && input.file_path) return String(input.file_path);
    if (toolName === 'Edit' && input.file_path) return String(input.file_path);
    if (toolName === 'Glob' && input.pattern) return String(input.pattern);
    if (toolName === 'Grep' && input.pattern) return String(input.pattern);
    if (toolName === 'Bash' && input.command) {
      const cmd = String(input.command);
      return cmd.length > 120 ? `${cmd.slice(0, 117)}...` : cmd;
    }
    if (toolName === 'Skill' && input.skill) return String(input.skill);
    if (toolName === 'Agent' && input.prompt) {
      const prompt = String(input.prompt);
      return prompt.length > 120 ? `${prompt.slice(0, 117)}...` : prompt;
    }
    if (toolName === 'WebSearch' && input.query) return String(input.query);
    if (toolName === 'WebFetch' && input.url) return String(input.url);
    if (toolName === 'TaskCreate' && input.description) return String(input.description);
    if (toolName === 'TodoWrite' && input.todos)
      return `${(input.todos as unknown[]).length} items`;
    // Fallback: show first string value from input for unknown tools
    for (const val of Object.values(input)) {
      if (typeof val === 'string' && val.length > 0) {
        return val.length > 120 ? `${val.slice(0, 117)}...` : val;
      }
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Timer helpers
  // ---------------------------------------------------------------------------

  /** Start or restart the idle timeout timer for a session. */
  private resetTimer(state: SessionState): void {
    this.clearTimer(state);
    const timeoutMs = this.getTimeoutMs();
    state.timer = setTimeout(() => {
      void this.stopSession(state.sessionId);
    }, timeoutMs);
  }

  /** Cancel the idle timer for a session. */
  private clearTimer(state: SessionState): void {
    if (state.timer !== null) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  /** Read the auto-timeout from settings or fall back to default. */
  private getTimeoutMs(): number {
    if (!hasSettings()) return DEFAULT_TIMEOUT_MS;
    const settings = getSettings();
    const minutes = settings.interactiveAgent?.autoTimeoutMinutes ?? 15;
    return minutes * 60 * 1000;
  }

  /** Read the concurrent session cap from settings or fall back to default. */
  private getCap(): number {
    if (!hasSettings()) return DEFAULT_CAP;
    const settings = getSettings();
    return settings.interactiveAgent?.maxConcurrentSessions ?? DEFAULT_CAP;
  }
}
