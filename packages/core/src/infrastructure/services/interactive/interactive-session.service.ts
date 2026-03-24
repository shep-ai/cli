/**
 * Interactive Session Service
 *
 * Singleton service that owns the lifecycle of all interactive agent sessions.
 * Each conversation turn spawns a fresh agent process in print mode (-p) with
 * stream-json output. Multi-turn context is maintained via the agent CLI's
 * --resume flag using the session_id returned in the first result event.
 *
 * Dependencies are injected via constructor for testability (no real processes
 * are spawned in unit tests — the factory is replaced with a test double).
 */

import * as crypto from 'node:crypto';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type {
  IInteractiveSessionService,
  StreamChunk,
  UnsubscribeFn,
  ChatState,
} from '../../../application/ports/output/services/interactive-session-service.interface.js';
import type { IInteractiveSessionRepository } from '../../../application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '../../../application/ports/output/repositories/interactive-message-repository.interface.js';
import type { IInteractiveAgentProcessFactory } from '../../../application/ports/output/agents/interactive-agent-process-factory.interface.js';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface.js';
import type { InteractiveSession, InteractiveMessage } from '../../../domain/generated/output.js';
import {
  InteractiveSessionStatus,
  InteractiveMessageRole,
} from '../../../domain/generated/output.js';
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
  /** Claude CLI session ID for --resume across turns. */
  claudeSessionId?: string;
  /** The currently-running per-turn process (null between turns). */
  activeProcess: ChildProcessWithoutNullStreams | null;
  timer: NodeJS.Timeout | null;
  /** Accumulates assistant text between user turns for persistence. */
  currentAssistantBuffer: string;
  /** Incomplete line data waiting for a newline. */
  lineBuffer: string;
  /** Accumulates tool events during a turn for rich message persistence. */
  toolEventsLog: string[];
  /** Subscriber callbacks for real-time stdout chunk forwarding. */
  subscribers: Set<(chunk: StreamChunk) => void>;
  /**
   * Resolve callback for the current turn's completion promise.
   * Set when spawning a turn process, cleared when result arrives.
   */
  onTurnComplete?: (result: TurnResult) => void;
  /** Reject callback for the current turn (process crashes before result). */
  onTurnError?: (err: Error) => void;
  /** User message content queued while session boots. */
  pendingUserContent?: string;
  /** Model override for the agent process (e.g. 'sonnet', 'opus', 'haiku'). */
  model?: string;
  /** Last known PID — persists after process exits between turns. */
  lastPid?: number;
}

/** Result extracted from a completed turn. */
interface TurnResult {
  text: string;
  sessionId?: string;
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
    private readonly processFactory: IInteractiveAgentProcessFactory,
    private readonly featureRepo: IFeatureRepository,
    private readonly contextBuilder: FeatureContextBuilder
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async startSession(
    featureId: string,
    worktreePath: string,
    model?: string
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

    // Carry over claudeSessionId from previous session so --resume works
    let previousClaudeSessionId: string | undefined;
    for (const [, s] of this.sessions) {
      if (s.featureId === featureId && s.claudeSessionId) {
        previousClaudeSessionId = s.claudeSessionId;
        break;
      }
    }
    // Also check stoppedSessions cache (populated on stop)
    if (!previousClaudeSessionId) {
      previousClaudeSessionId = this.stoppedClaudeSessionIds.get(featureId);
    }

    // Set up in-memory state
    const state: SessionState = {
      sessionId: session.id,
      featureId,
      worktreePath,
      model,
      claudeSessionId: previousClaudeSessionId,
      activeProcess: null,
      timer: null,
      currentAssistantBuffer: '',
      lineBuffer: '',
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
   * spawn a one-shot agent process, pipe the context prompt to stdin,
   * wait for the result event (greeting + session_id), persist the
   * greeting, and transition the session to "ready".
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
      const lastMsg = previousMessages.length > 0 ? previousMessages[previousMessages.length - 1] : null;
      const userIsWaiting = lastMsg?.role === InteractiveMessageRole.user;

      if (previousMessages.length > 0) {
        const historyBlock = previousMessages
          .map(
            (m) =>
              `[${m.role === InteractiveMessageRole.user ? 'User' : 'Assistant'}]: ${m.content}`
          )
          .join('\n\n');
        bootPrompt += `\n\n---\nPrevious conversation history (READ-ONLY — this is what already happened, do NOT repeat or redo any of this work):\n${historyBlock}\n---\n\n`;

        bootPrompt += `CRITICAL INSTRUCTIONS:
- The conversation history above is READ-ONLY context. All that work is ALREADY DONE. Do NOT repeat, redo, or re-execute anything from the history.
- You are resuming an interactive chat session after a process restart. The user is waiting for you in a chat interface.
`;

        if (userIsWaiting) {
          bootPrompt += `- The user's LATEST message (the last [User] entry above) is waiting for your response RIGHT NOW.
- Respond to it directly and concisely. Do NOT re-do any previous work. Just answer what they asked.
- You may briefly acknowledge the session restarted, but focus on answering their question.`;
        } else {
          bootPrompt += `- The last response was from you (Assistant). The user hasn't sent a new message yet.
- Briefly greet the user and let them know you're back and ready. Keep it short — one sentence.`;
        }
      }

      // Clear pending — it's handled via history detection above
      if (state.pendingUserContent) {
        state.pendingUserContent = undefined;
      }

      // Spawn the boot turn and wait for result
      const result = await this.executeTurn(state, bootPrompt, BOOT_TIMEOUT_MS);

      // Store the claude session ID for subsequent --resume calls
      if (result.sessionId) {
        state.claudeSessionId = result.sessionId;
      }

      // Persist greeting/response and mark session ready
      const greetingMsg: InteractiveMessage = {
        id: crypto.randomUUID(),
        featureId,
        sessionId: state.sessionId,
        role: InteractiveMessageRole.assistant,
        content: result.text,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.messageRepo.create(greetingMsg);
      await this.sessionRepo.updateStatus(state.sessionId, InteractiveSessionStatus.ready);

      // Start idle timer now that the session is live
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

    // Reject pending turn promise so executeTurn does not hang
    if (state.onTurnError) {
      const reject = state.onTurnError;
      state.onTurnComplete = undefined;
      state.onTurnError = undefined;
      reject(new Error('Session stopped during active turn'));
    }

    this.clearTimer(state);
    // Cache claudeSessionId so --resume works when session restarts
    if (state.claudeSessionId) {
      this.stoppedClaudeSessionIds.set(state.featureId, state.claudeSessionId);
    }
    this.sessions.delete(sessionId);

    // Kill the active per-turn process if one is running
    if (state.activeProcess) {
      try {
        state.activeProcess.kill('SIGTERM');
      } catch {
        // Process may already be dead
      }
      state.activeProcess = null;
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

    // Spawn a per-turn process with --resume to continue the conversation
    // This is fire-and-forget — the response streams to subscribers and
    // is persisted when the result event arrives.
    void this.executeAndPersistTurn(state, content);

    return message;
  }

  /**
   * Execute a turn and persist the assistant response when complete.
   */
  private async executeAndPersistTurn(state: SessionState, prompt: string): Promise<void> {
    try {
      const result = await this.executeTurn(state, prompt);

      // Update claude session ID if returned (should be stable across turns)
      if (result.sessionId) {
        state.claudeSessionId = result.sessionId;
      }

      // Persist assistant message
      const now = new Date();
      const msg: InteractiveMessage = {
        id: crypto.randomUUID(),
        featureId: state.featureId,
        sessionId: state.sessionId,
        role: InteractiveMessageRole.assistant,
        content: result.text,
        createdAt: now,
        updatedAt: now,
      };
      await this.messageRepo.create(msg);
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
  // Per-turn process management
  // ---------------------------------------------------------------------------

  /**
   * Spawn a single-turn agent process, pipe the prompt to stdin, and wait
   * for the result event. Returns the result text and optional session_id.
   *
   * The process exits after producing the result (print mode).
   */
  private executeTurn(
    state: SessionState,
    prompt: string,
    timeoutMs?: number
  ): Promise<TurnResult> {
    return new Promise<TurnResult>((resolve, reject) => {
      void this.spawnTurnProcess(state, prompt, timeoutMs, resolve, reject);
    });
  }

  private async spawnTurnProcess(
    state: SessionState,
    prompt: string,
    timeoutMs: number | undefined,
    resolve: (result: TurnResult) => void,
    reject: (err: Error) => void
  ): Promise<void> {
    try {
      const proc = await this.processFactory.spawn(state.worktreePath, {
        resumeSessionId: state.claudeSessionId,
        model: state.model,
      });

      state.activeProcess = proc;
      state.lastPid = proc.pid;
      state.currentAssistantBuffer = '';
      state.lineBuffer = '';
      state.toolEventsLog = [];
      state.onTurnComplete = resolve;
      state.onTurnError = reject;

      // Set up timeout
      let turnTimeout: NodeJS.Timeout | undefined;
      if (timeoutMs) {
        turnTimeout = setTimeout(() => {
          if (state.onTurnError) {
            const rej = state.onTurnError;
            state.onTurnComplete = undefined;
            state.onTurnError = undefined;
            state.activeProcess = null;
            try {
              proc.kill('SIGTERM');
            } catch {
              // ignore
            }
            rej(new Error(`Agent turn timed out after ${timeoutMs / 1000}s`));
          }
        }, timeoutMs);
      }

      // Attach stdout parser and close handler
      this.attachStdoutParser(state, turnTimeout);
      this.attachCloseHandler(state, turnTimeout);

      // Write prompt to stdin and end it to trigger execution
      proc.stdin.write(prompt);
      proc.stdin.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // ---------------------------------------------------------------------------
  // Stdout parsing
  // ---------------------------------------------------------------------------

  /**
   * Attach a raw data listener to the process stdout that manually buffers
   * incomplete lines. Matches the claude-code-executor approach.
   */
  private attachStdoutParser(state: SessionState, turnTimeout?: NodeJS.Timeout): void {
    const proc = state.activeProcess;
    if (!proc) return;

    proc.stdout.on('data', (chunk: Buffer | string) => {
      state.lineBuffer += chunk.toString();
      const lines = state.lineBuffer.split('\n');
      state.lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) this.handleStdoutLine(state, trimmed, turnTimeout);
      }
    });
  }

  /**
   * Parse a single stdout line and dispatch to subscribers / resolve turn.
   */
  private handleStdoutLine(state: SessionState, line: string, turnTimeout?: NodeJS.Timeout): void {
    // Reset idle timer on any agent activity
    this.resetTimer(state);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line);
    } catch {
      // Non-JSON line — ignore
      return;
    }

    const type = parsed.type as string;

    if (type === 'assistant') {
      // An assistant message block — may contain tool_use entries and text
      const messageContent = parsed.message as
        | {
            content?: {
              type: string;
              name?: string;
              text?: string;
              input?: Record<string, unknown>;
            }[];
          }
        | undefined;
      if (Array.isArray(messageContent?.content)) {
        for (const block of messageContent.content) {
          if (block.type === 'tool_use' && block.name) {
            const detail =
              this.extractToolDetail(block.name, block.input) ??
              // Fallback: compact JSON of the full input if no specific detail extracted
              (block.input && Object.keys(block.input).length > 0
                ? JSON.stringify(block.input).slice(0, 150)
                : undefined);
            // Persist tool event as its own message immediately
            void this.persistToolEvent(state, block.name, detail);
            state.subscribers.forEach((sub) =>
              sub({
                delta: '',
                done: false,
                log: `Using tool: ${block.name}`,
                activity: { kind: 'tool_use', label: block.name!, detail },
              })
            );
          } else if (block.type === 'text' && block.text?.trim()) {
            state.currentAssistantBuffer += block.text;
            state.subscribers.forEach((sub) => sub({ delta: block.text!, done: false }));
          }
        }
      }
      return;
    }

    if (type === 'text' || type === 'content_block_delta') {
      // Token-level delta
      const rawDelta =
        (parsed.delta as string | undefined) ??
        (parsed.text as string | undefined) ??
        (parsed.delta as Record<string, string> | undefined)?.text;
      if (rawDelta) {
        state.currentAssistantBuffer += rawDelta;
        state.subscribers.forEach((sub) => sub({ delta: rawDelta, done: false }));
      }
      return;
    }

    if (type === 'tool_use' || type === 'tool_result') {
      // Tool events (outside of assistant blocks)
      const toolName = (parsed.name as string) ?? (parsed.tool as string) ?? type;
      const input = parsed.input as Record<string, unknown> | undefined;
      const detail =
        this.extractToolDetail(toolName, input) ??
        (input && Object.keys(input).length > 0 ? JSON.stringify(input).slice(0, 150) : undefined);
      const kind = type === 'tool_use' ? ('tool_use' as const) : ('tool_result' as const);
      // Persist tool event as its own message
      void this.persistToolEvent(state, toolName, detail);
      state.subscribers.forEach((sub) =>
        sub({
          delta: '',
          done: false,
          log: `${type === 'tool_use' ? 'Using' : 'Completed'}: ${toolName}`,
          activity: { kind, label: toolName, detail },
        })
      );
      return;
    }

    if (type === 'tool_progress') {
      const toolName = (parsed.tool_name as string) ?? 'tool';
      state.subscribers.forEach((sub) =>
        sub({
          delta: '',
          done: false,
          log: `Running: ${toolName}`,
        })
      );
      return;
    }

    if (type === 'system') {
      const subtype = parsed.subtype as string;
      if (subtype === 'init' && !state.claudeSessionId) {
        // Only show on cold start (first turn), not on resumed turns
        const model = (parsed.model as string) ?? '';
        const version = (parsed.claude_code_version as string) ?? '';
        const tools = parsed.tools as string[] | undefined;
        const pid = state.activeProcess?.pid ?? '';
        const parts = [
          model ? `${model}` : null,
          tools ? `${tools.length} tools` : null,
          version ? `v${version}` : null,
          pid ? `pid ${pid}` : null,
        ].filter(Boolean);
        const detail = parts.join(' · ');
        void this.persistToolEvent(state, 'Session started', detail ?? undefined);
        state.subscribers.forEach((sub) =>
          sub({
            delta: '',
            done: false,
            activity: { kind: 'system', label: 'Session started', detail: detail ?? undefined },
          })
        );
      }
      return;
    }

    if (type === 'result') {
      const resultText = (parsed.result as string) ?? state.currentAssistantBuffer;
      const resultSessionId = parsed.session_id as string | undefined;

      state.currentAssistantBuffer = '';
      state.toolEventsLog = [];

      // Clear turn timeout
      if (turnTimeout) clearTimeout(turnTimeout);

      // Resolve the turn promise — only the clean response text
      if (state.onTurnComplete) {
        const resolve = state.onTurnComplete;
        state.onTurnComplete = undefined;
        state.onTurnError = undefined;
        resolve({ text: resultText, sessionId: resultSessionId });
      }

      // Notify subscribers of end-of-turn
      state.subscribers.forEach((sub) => sub({ delta: '', done: true }));
    }
  }

  /**
   * Handle process exit — clean up activeProcess reference.
   * If the turn promise hasn't resolved yet, reject it.
   */
  private attachCloseHandler(state: SessionState, turnTimeout?: NodeJS.Timeout): void {
    const proc = state.activeProcess;
    if (!proc) return;

    proc.once('close', (code: number | null) => {
      // Clear turn timeout
      if (turnTimeout) clearTimeout(turnTimeout);

      // Flush remaining buffer
      if (state.lineBuffer.trim()) {
        this.handleStdoutLine(state, state.lineBuffer.trim(), undefined);
      }

      // Clear activeProcess reference (process has exited)
      if (state.activeProcess === proc) {
        state.activeProcess = null;
      }

      // If still waiting for turn result, reject
      if (state.onTurnError) {
        const reject = state.onTurnError;
        state.onTurnComplete = undefined;
        state.onTurnError = undefined;
        reject(new Error(`Agent process exited with code ${code} before producing a result`));
      }
    });
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
        pid: state.activeProcess?.pid ?? state.lastPid ?? null,
        sessionId: state.claudeSessionId ?? state.sessionId,
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
