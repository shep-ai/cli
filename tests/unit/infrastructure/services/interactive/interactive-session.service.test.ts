/**
 * InteractiveSessionService Unit Tests
 *
 * TDD: RED → GREEN → REFACTOR
 *
 * All external dependencies (repos, factory, context builder, feature repo,
 * settings) are mocked. No real processes are spawned.
 *
 * The service uses per-turn process spawning: each message spawns a new
 * process with --resume. Tests simulate this by having the factory return
 * fresh fake processes on each call.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { InteractiveSessionService } from '@/infrastructure/services/interactive/interactive-session.service.js';
import { ConcurrentSessionLimitError } from '@/domain/errors/concurrent-session-limit.error.js';
import type { IInteractiveSessionRepository } from '@/application/ports/output/repositories/interactive-session-repository.interface.js';
import type { IInteractiveMessageRepository } from '@/application/ports/output/repositories/interactive-message-repository.interface.js';
import type { IInteractiveAgentProcessFactory } from '@/application/ports/output/agents/interactive-agent-process-factory.interface.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { FeatureContextBuilder } from '@/infrastructure/services/interactive/feature-context.builder.js';
import type { Feature, InteractiveSession } from '@/domain/generated/output.js';
import {
  InteractiveSessionStatus,
  InteractiveMessageRole,
  SdlcLifecycle,
  TaskState,
} from '@/domain/generated/output.js';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-1',
    name: 'Test Feature',
    userQuery: 'do something',
    slug: 'test-feature',
    description: 'test',
    repositoryPath: '/repo',
    branch: 'feat/test',
    lifecycle: SdlcLifecycle.Implementation,
    messages: [],
    plan: {
      id: 'plan-1',
      overview: 'build it',
      requirements: [],
      artifacts: [],
      tasks: [
        {
          id: 't1',
          title: 'Task 1',
          state: TaskState.Todo,
          dependsOn: [],
          actionItems: [],
          baseBranch: 'main',
          branch: 'feat/t1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      state: 'Ready' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    relatedArtifacts: [],
    fast: false,
    push: false,
    openPr: false,
    forkAndPr: false,
    commitSpecs: false,
    ciWatchEnabled: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    worktreePath: '/repo/.worktrees/test',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Feature;
}

interface FakeProcess {
  proc: ChildProcessWithoutNullStreams;
  stdout: EventEmitter;
  stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
}

/** Create a controllable fake ChildProcess */
function makeFakeProcess(): FakeProcess {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const stdin = { write: vi.fn(), end: vi.fn() };
  const proc = new EventEmitter() as unknown as ChildProcessWithoutNullStreams;
  Object.assign(proc, { stdout, stderr, stdin, pid: 42, kill: vi.fn() });
  return { proc, stdout, stdin };
}

/** Emit a stream-json line on stdout */
function emitLine(stdout: EventEmitter, obj: Record<string, unknown>): void {
  stdout.emit('data', Buffer.from(`${JSON.stringify(obj)}\n`));
}

/**
 * Flush the microtask queue by repeatedly yielding control.
 * Needed because the service has multiple sequential async operations.
 */
async function flushPromises(rounds = 15): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

describe('InteractiveSessionService', () => {
  let sessionRepo: IInteractiveSessionRepository;
  let messageRepo: IInteractiveMessageRepository;
  let processFactory: IInteractiveAgentProcessFactory;
  let featureRepo: IFeatureRepository;
  let contextBuilder: FeatureContextBuilder;
  let service: InteractiveSessionService;

  /** Stack of fake processes the factory will return, one per spawn() call. */
  let fakeProcesses: FakeProcess[];

  /** Get the most recently spawned fake process. */
  function latestProc(): FakeProcess {
    return fakeProcesses[fakeProcesses.length - 1];
  }

  beforeEach(() => {
    vi.useFakeTimers();

    fakeProcesses = [];

    sessionRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn().mockImplementation((id: string) =>
        Promise.resolve({
          id,
          featureId: 'feat-1',
          status: InteractiveSessionStatus.ready,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as InteractiveSession)
      ),
      findByFeatureId: vi.fn().mockResolvedValue(null),
      findAllActive: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      updateLastActivity: vi.fn().mockResolvedValue(undefined),
      markAllActiveStopped: vi.fn().mockResolvedValue(undefined),
      countActiveSessions: vi.fn().mockResolvedValue(0),
    };

    messageRepo = {
      create: vi.fn().mockResolvedValue(undefined),
      findByFeatureId: vi.fn().mockResolvedValue([]),
      findBySessionId: vi.fn().mockResolvedValue([]),
      deleteByFeatureId: vi.fn().mockResolvedValue(undefined),
    };

    processFactory = {
      spawn: vi.fn().mockImplementation(() => {
        const fp = makeFakeProcess();
        fakeProcesses.push(fp);
        return Promise.resolve(fp.proc);
      }),
    };

    featureRepo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(makeFeature()),
      findByIdPrefix: vi.fn(),
      findBySlug: vi.fn(),
      findByBranch: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      findByParentId: vi.fn(),
      delete: vi.fn(),
      softDelete: vi.fn(),
    } as unknown as IFeatureRepository;

    contextBuilder = new FeatureContextBuilder();

    service = new InteractiveSessionService(
      sessionRepo,
      messageRepo,
      processFactory,
      featureRepo,
      contextBuilder
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * Start a session and complete the async boot by emitting a result event.
   * startSession returns immediately (booting status); we then simulate the
   * agent's first result to transition to ready.
   */
  async function startAndBoot(): Promise<InteractiveSession> {
    const session = await service.startSession('feat-1', '/wt');
    await flushPromises();
    // The async boot spawned a process — emit the greeting result with session_id
    emitLine(latestProc().stdout, {
      type: 'result',
      result: 'Hey!',
      session_id: 'claude-session-abc',
    });
    await flushPromises();
    return session;
  }

  // -------------------------------------------------------------------------
  // startSession
  // -------------------------------------------------------------------------

  describe('startSession', () => {
    it('throws ConcurrentSessionLimitError when at the default cap of 3', async () => {
      (sessionRepo.countActiveSessions as ReturnType<typeof vi.fn>).mockResolvedValue(3);
      await expect(service.startSession('feat-1', '/wt')).rejects.toBeInstanceOf(
        ConcurrentSessionLimitError
      );
    });

    it('throws ConcurrentSessionLimitError with correct counts', async () => {
      (sessionRepo.countActiveSessions as ReturnType<typeof vi.fn>).mockResolvedValue(3);
      const err = await service.startSession('feat-1', '/wt').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ConcurrentSessionLimitError);
      expect((err as ConcurrentSessionLimitError).activeSessions).toBe(3);
      expect((err as ConcurrentSessionLimitError).cap).toBe(3);
    });

    it('creates a session record in the repository and returns immediately in booting status', async () => {
      const session = await service.startSession('feat-1', '/wt');
      expect(sessionRepo.create).toHaveBeenCalled();
      expect(session).toBeDefined();
      expect(session.status).toBe(InteractiveSessionStatus.booting);
    });

    it('spawns a process via the factory with the worktree path', async () => {
      await service.startSession('feat-1', '/my/worktree');
      await flushPromises();
      expect(processFactory.spawn).toHaveBeenCalledWith('/my/worktree', {
        resumeSessionId: undefined,
      });
    });

    it('writes feature context to stdin and ends it', async () => {
      await service.startSession('feat-1', '/wt');
      await flushPromises();
      const fp = latestProc();
      expect(fp.stdin.write).toHaveBeenCalled();
      const firstWrite = fp.stdin.write.mock.calls[0][0] as string;
      expect(firstWrite).toContain('FEATURE CONTEXT');
      expect(fp.stdin.end).toHaveBeenCalled();
    });

    it('persists the greeting assistant message after boot completes', async () => {
      const session = await service.startSession('feat-1', '/wt');
      await flushPromises();
      emitLine(latestProc().stdout, {
        type: 'result',
        result: 'Hey, how can I help?',
        session_id: 'claude-abc',
      });
      await flushPromises();

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: InteractiveMessageRole.assistant,
          content: 'Hey, how can I help?',
          featureId: 'feat-1',
          sessionId: session.id,
        })
      );
    });

    it('transitions session to ready after greeting is received', async () => {
      const session = await service.startSession('feat-1', '/wt');
      await flushPromises();
      emitLine(latestProc().stdout, {
        type: 'result',
        result: 'Hey!',
        session_id: 'claude-abc',
      });
      await flushPromises();

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        session.id,
        InteractiveSessionStatus.ready
      );
    });
  });

  // -------------------------------------------------------------------------
  // stopSession
  // -------------------------------------------------------------------------

  describe('stopSession', () => {
    it('updates the session status to stopped', async () => {
      const session = await startAndBoot();
      // Clear mock calls from startup
      (sessionRepo.updateStatus as ReturnType<typeof vi.fn>).mockClear();

      await service.stopSession(session.id);

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        session.id,
        InteractiveSessionStatus.stopped,
        expect.any(Date)
      );
    });

    it('is idempotent — calling twice does not throw', async () => {
      const session = await startAndBoot();
      await service.stopSession(session.id);
      await expect(service.stopSession(session.id)).resolves.not.toThrow();
    });

    it('can stop a session that is still booting', async () => {
      const session = await service.startSession('feat-1', '/wt');
      await flushPromises();

      // Stop before the agent sends a result
      await service.stopSession(session.id);

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        session.id,
        InteractiveSessionStatus.stopped,
        expect.any(Date)
      );
    });

    it('kills the active process if one is running during boot', async () => {
      const session = await service.startSession('feat-1', '/wt');
      await flushPromises();

      const fp = latestProc();
      await service.stopSession(session.id);
      expect((fp.proc as unknown as { kill: ReturnType<typeof vi.fn> }).kill).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // sendMessage
  // -------------------------------------------------------------------------

  describe('sendMessage', () => {
    it('spawns a new process with --resume for each message', async () => {
      const session = await startAndBoot();
      (processFactory.spawn as ReturnType<typeof vi.fn>).mockClear();

      await service.sendMessage(session.id, 'Hello agent');
      await flushPromises();

      expect(processFactory.spawn).toHaveBeenCalledWith('/wt', {
        resumeSessionId: 'claude-session-abc',
      });
    });

    it('writes the message content to stdin and ends it', async () => {
      const session = await startAndBoot();

      await service.sendMessage(session.id, 'Hello agent');
      await flushPromises();

      const fp = latestProc();
      const writes = fp.stdin.write.mock.calls.map((c) => c[0] as string);
      expect(writes.some((w) => w.includes('Hello agent'))).toBe(true);
      expect(fp.stdin.end).toHaveBeenCalled();
    });

    it('persists the user message to the repository', async () => {
      const session = await startAndBoot();
      messageRepo.create = vi.fn().mockResolvedValue(undefined);

      await service.sendMessage(session.id, 'Test message');

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: InteractiveMessageRole.user,
          content: 'Test message',
          featureId: 'feat-1',
          sessionId: session.id,
        })
      );
    });

    it('persists the assistant response when result arrives', async () => {
      const session = await startAndBoot();
      messageRepo.create = vi.fn().mockResolvedValue(undefined);

      await service.sendMessage(session.id, 'Test message');
      await flushPromises();

      // Emit the agent's response
      const fp = latestProc();
      emitLine(fp.stdout, {
        type: 'result',
        result: 'Agent response',
        session_id: 'claude-session-abc',
      });
      await flushPromises();

      expect(messageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: InteractiveMessageRole.assistant,
          content: 'Agent response',
          featureId: 'feat-1',
          sessionId: session.id,
        })
      );
    });

    it('throws when the session is not in ready status', async () => {
      // findById returns stopped session
      (sessionRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'some-session',
        featureId: 'feat-1',
        status: InteractiveSessionStatus.stopped,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.sendMessage('some-session', 'Hi')).rejects.toThrow(/not ready/i);
    });
  });

  // -------------------------------------------------------------------------
  // idle timeout
  // -------------------------------------------------------------------------

  describe('idle timeout', () => {
    it('stops the session after the default idle timeout (15 min)', async () => {
      const session = await startAndBoot();
      (sessionRepo.updateStatus as ReturnType<typeof vi.fn>).mockClear();

      // Advance clock past the default 15-minute timeout
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      await flushPromises();

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        session.id,
        InteractiveSessionStatus.stopped,
        expect.any(Date)
      );
    });

    it('does not stop the session before the timeout expires', async () => {
      await startAndBoot();
      (sessionRepo.updateStatus as ReturnType<typeof vi.fn>).mockClear();

      // Advance to just before the timeout
      vi.advanceTimersByTime(14 * 60 * 1000);
      await flushPromises();

      // updateStatus should NOT have been called with 'stopped' yet
      const stoppedCalls = (sessionRepo.updateStatus as ReturnType<typeof vi.fn>).mock.calls.filter(
        (c) => c[1] === InteractiveSessionStatus.stopped
      );
      expect(stoppedCalls.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // stdout streaming and end-of-turn
  // -------------------------------------------------------------------------

  describe('stdout streaming', () => {
    it('notifies subscribers with delta chunks from agent stdout', async () => {
      const session = await startAndBoot();

      // Send a message to spawn a new turn process
      await service.sendMessage(session.id, 'Tell me something');
      await flushPromises();

      const chunks: string[] = [];
      service.subscribe(session.id, (chunk) => {
        if (!chunk.done && chunk.delta) chunks.push(chunk.delta);
      });

      const fp = latestProc();
      emitLine(fp.stdout, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello ' }] },
      });
      emitLine(fp.stdout, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'world' }] },
      });
      await flushPromises();

      expect(chunks).toContain('Hello ');
      expect(chunks).toContain('world');
    });

    it('notifies subscribers with done=true on result event', async () => {
      const session = await startAndBoot();

      await service.sendMessage(session.id, 'Tell me something');
      await flushPromises();

      let doneReceived = false;
      service.subscribe(session.id, (chunk) => {
        if (chunk.done) doneReceived = true;
      });

      const fp = latestProc();
      emitLine(fp.stdout, {
        type: 'result',
        result: 'Final answer.',
        session_id: 'claude-session-abc',
      });
      await flushPromises();

      expect(doneReceived).toBe(true);
    });

    it('unsubscribes when the returned function is called', async () => {
      const session = await startAndBoot();

      await service.sendMessage(session.id, 'Tell me something');
      await flushPromises();

      const chunks: string[] = [];
      const unsub = service.subscribe(session.id, (chunk) => {
        if (!chunk.done && chunk.delta) chunks.push(chunk.delta);
      });

      const fp = latestProc();
      emitLine(fp.stdout, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Before unsub' }] },
      });
      await flushPromises();
      unsub();
      emitLine(fp.stdout, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'After unsub' }] },
      });
      await flushPromises();

      expect(chunks).toContain('Before unsub');
      expect(chunks).not.toContain('After unsub');
    });
  });

  // -------------------------------------------------------------------------
  // getMessages / getSession
  // -------------------------------------------------------------------------

  describe('getMessages', () => {
    it('delegates to messageRepo.findByFeatureId', async () => {
      await service.getMessages('feat-1');
      expect(messageRepo.findByFeatureId).toHaveBeenCalledWith('feat-1', undefined);
    });
  });

  describe('getSession', () => {
    it('delegates to sessionRepo.findById', async () => {
      await service.getSession('session-1');
      expect(sessionRepo.findById).toHaveBeenCalledWith('session-1');
    });
  });

  // -------------------------------------------------------------------------
  // process crash / unexpected close during boot
  // -------------------------------------------------------------------------

  describe('process close', () => {
    it('marks session as error when boot process crashes before result', async () => {
      const session = await service.startSession('feat-1', '/wt');
      await flushPromises();
      (sessionRepo.updateStatus as ReturnType<typeof vi.fn>).mockClear();

      // Process crashes before sending a result
      const fp = latestProc();
      (fp.proc as EventEmitter).emit('close', 1);
      await flushPromises();

      expect(sessionRepo.updateStatus).toHaveBeenCalledWith(
        session.id,
        InteractiveSessionStatus.error
      );
    });
  });

  // =========================================================================
  // Feature-scoped API (cold/hot start flows)
  // =========================================================================

  describe('sendUserMessage (feature-scoped)', () => {
    // ── Cold start ────────────────────────────────────────────────────────

    describe('cold start — no active session', () => {
      it('persists the user message to the DB immediately', async () => {
        (messageRepo.create as ReturnType<typeof vi.fn>).mockClear();
        await service.sendUserMessage('feat-1', 'Hey', '/wt');

        expect(messageRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            role: InteractiveMessageRole.user,
            content: 'Hey',
            featureId: 'feat-1',
          })
        );
      });

      it('boots a new session when no active session exists', async () => {
        await service.sendUserMessage('feat-1', 'Hey', '/wt');
        await flushPromises();

        expect(sessionRepo.create).toHaveBeenCalled();
        expect(processFactory.spawn).toHaveBeenCalled();
      });

      it('does NOT send the pending message as a separate turn after boot', async () => {
        // The user message is in the boot prompt context — it should NOT be sent again
        await service.sendUserMessage('feat-1', 'Hey', '/wt');
        await flushPromises();

        // Complete boot with greeting
        const bootProc = latestProc();
        emitLine(bootProc.stdout, {
          type: 'result',
          result: 'Hi! How can I help?',
          session_id: 'claude-session-xyz',
        });
        await flushPromises();

        // Only 1 process should have been spawned (the boot process).
        // If pending message was sent as a separate turn, a 2nd process would spawn.
        expect(processFactory.spawn).toHaveBeenCalledTimes(1);
      });

      it('includes user message in boot context history', async () => {
        // Mock that the DB has the just-persisted user message
        (messageRepo.findByFeatureId as ReturnType<typeof vi.fn>).mockResolvedValue([
          {
            id: 'msg-1',
            featureId: 'feat-1',
            role: InteractiveMessageRole.user,
            content: 'Hey',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);

        await service.sendUserMessage('feat-1', 'Hey', '/wt');
        await flushPromises();

        // The boot prompt written to stdin should contain the user's message
        const fp = latestProc();
        const stdinContent = fp.stdin.write.mock.calls[0][0] as string;
        expect(stdinContent).toContain('Hey');
        expect(stdinContent).toContain("respond to the user's latest message");
      });

      it('persists the assistant response after boot completes', async () => {
        (messageRepo.create as ReturnType<typeof vi.fn>).mockClear();
        await service.sendUserMessage('feat-1', 'Hey', '/wt');
        await flushPromises();

        emitLine(latestProc().stdout, {
          type: 'result',
          result: 'Hello! I can help with that.',
          session_id: 'claude-session-xyz',
        });
        await flushPromises();

        // Should have persisted: 1) user message, 2) assistant greeting/response
        const createCalls = (messageRepo.create as ReturnType<typeof vi.fn>).mock.calls;
        expect(createCalls.length).toBe(2);
        expect(createCalls[0][0]).toMatchObject({
          role: InteractiveMessageRole.user,
          content: 'Hey',
        });
        expect(createCalls[1][0]).toMatchObject({
          role: InteractiveMessageRole.assistant,
          content: 'Hello! I can help with that.',
        });
      });
    });

    // ── Hot start ─────────────────────────────────────────────────────────

    describe('hot start — session already ready', () => {
      it('does NOT boot a new session', async () => {
        // Boot a session first
        await startAndBoot();
        (sessionRepo.create as ReturnType<typeof vi.fn>).mockClear();
        (processFactory.spawn as ReturnType<typeof vi.fn>).mockClear();

        await service.sendUserMessage('feat-1', 'What is 1+1?', '/wt');
        await flushPromises();

        // No new session created, but a new process is spawned for the turn
        expect(sessionRepo.create).not.toHaveBeenCalled();
        expect(processFactory.spawn).toHaveBeenCalledTimes(1);
      });

      it('sends the message directly to the agent', async () => {
        await startAndBoot();
        (processFactory.spawn as ReturnType<typeof vi.fn>).mockClear();

        await service.sendUserMessage('feat-1', 'What is 1+1?', '/wt');
        await flushPromises();

        const fp = latestProc();
        const stdinContent = fp.stdin.write.mock.calls[0][0] as string;
        expect(stdinContent).toBe('What is 1+1?');
      });

      it('persists both user message and assistant response', async () => {
        await startAndBoot();
        (messageRepo.create as ReturnType<typeof vi.fn>).mockClear();

        await service.sendUserMessage('feat-1', 'What is 1+1?', '/wt');
        await flushPromises();

        emitLine(latestProc().stdout, {
          type: 'result',
          result: '1+1 = 2',
          session_id: 'claude-session-abc',
        });
        await flushPromises();

        const createCalls = (messageRepo.create as ReturnType<typeof vi.fn>).mock.calls;
        expect(createCalls.length).toBe(2);
        expect(createCalls[0][0]).toMatchObject({
          role: InteractiveMessageRole.user,
          content: 'What is 1+1?',
        });
        expect(createCalls[1][0]).toMatchObject({
          role: InteractiveMessageRole.assistant,
          content: '1+1 = 2',
        });
      });

      it('uses --resume with the stored claude session ID', async () => {
        await startAndBoot();
        (processFactory.spawn as ReturnType<typeof vi.fn>).mockClear();

        await service.sendUserMessage('feat-1', 'Hello', '/wt');
        await flushPromises();

        expect(processFactory.spawn).toHaveBeenCalledWith('/wt', {
          resumeSessionId: 'claude-session-abc',
        });
      });
    });

    // ── Booting session ───────────────────────────────────────────────────

    describe('message during boot', () => {
      it('queues message when session is still booting', async () => {
        // Start a session but don't complete boot
        await service.startSession('feat-1', '/wt');
        await flushPromises();

        // Now send a user message while booting
        (messageRepo.create as ReturnType<typeof vi.fn>).mockClear();
        await service.sendUserMessage('feat-1', 'Hurry up!', '/wt');

        // User message should be persisted immediately
        expect(messageRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ role: InteractiveMessageRole.user, content: 'Hurry up!' })
        );

        // But no new session or process should be started (one is already booting)
        expect(sessionRepo.create).toHaveBeenCalledTimes(1);
      });
    });
  });

  // =========================================================================
  // getChatState
  // =========================================================================

  describe('getChatState', () => {
    it('returns messages from the database', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          featureId: 'feat-1',
          role: InteractiveMessageRole.user,
          content: 'Hey',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'msg-2',
          featureId: 'feat-1',
          role: InteractiveMessageRole.assistant,
          content: 'Hello!',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (messageRepo.findByFeatureId as ReturnType<typeof vi.fn>).mockResolvedValue(mockMessages);

      const state = await service.getChatState('feat-1');
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].content).toBe('Hey');
      expect(state.messages[1].content).toBe('Hello!');
    });

    it('returns null status when no active session', async () => {
      const state = await service.getChatState('feat-1');
      expect(state.sessionStatus).toBeNull();
      expect(state.streamingText).toBeNull();
    });

    it('returns booting status during boot', async () => {
      // Override findById to return booting status
      (sessionRepo.findById as ReturnType<typeof vi.fn>).mockImplementation((id: string) =>
        Promise.resolve({
          id,
          featureId: 'feat-1',
          status: InteractiveSessionStatus.booting,
          startedAt: new Date(),
          lastActivityAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      );

      await service.startSession('feat-1', '/wt');
      await flushPromises();

      const state = await service.getChatState('feat-1');
      expect(state.sessionStatus).toBe(InteractiveSessionStatus.booting);
    });

    it('returns streaming text from the current assistant buffer', async () => {
      const session = await startAndBoot();

      // Send a message to start a turn
      await service.sendMessage(session.id, 'Tell me something');
      await flushPromises();

      // Emit partial text — this fills the assistant buffer
      const fp = latestProc();
      emitLine(fp.stdout, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Partial response...' }] },
      });
      await flushPromises();

      const state = await service.getChatState('feat-1');
      expect(state.streamingText).toBe('Partial response...');
    });
  });

  // =========================================================================
  // subscribeByFeature
  // =========================================================================

  describe('subscribeByFeature', () => {
    it('receives deltas from the active session for the feature', async () => {
      const session = await startAndBoot();

      const chunks: string[] = [];
      service.subscribeByFeature('feat-1', (chunk) => {
        if (chunk.delta) chunks.push(chunk.delta);
      });

      // Send a message to spawn a turn process
      await service.sendMessage(session.id, 'Tell me');
      await flushPromises();

      const fp = latestProc();
      emitLine(fp.stdout, {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'Hello from agent' }] },
      });
      await flushPromises();

      expect(chunks).toContain('Hello from agent');
    });

    it('returns a no-op unsubscribe when no active session exists', () => {
      const unsub = service.subscribeByFeature('nonexistent-feature', () => undefined);
      expect(unsub).toBeInstanceOf(Function);
      // Should not throw
      unsub();
    });

    it('receives tool use log events', async () => {
      const session = await startAndBoot();

      const logs: string[] = [];
      service.subscribeByFeature('feat-1', (chunk) => {
        if (chunk.log) logs.push(chunk.log);
      });

      await service.sendMessage(session.id, 'Read a file');
      await flushPromises();

      const fp = latestProc();
      emitLine(fp.stdout, {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/src/app.ts' } }],
        },
      });
      await flushPromises();

      expect(logs.some((l) => l.includes('Read'))).toBe(true);
    });

    it('receives done event when turn completes', async () => {
      const session = await startAndBoot();

      let done = false;
      service.subscribeByFeature('feat-1', (chunk) => {
        if (chunk.done) done = true;
      });

      await service.sendMessage(session.id, 'Quick question');
      await flushPromises();

      emitLine(latestProc().stdout, {
        type: 'result',
        result: 'Quick answer',
        session_id: 'claude-session-abc',
      });
      await flushPromises();

      expect(done).toBe(true);
    });
  });

  // =========================================================================
  // Tool events in persisted messages
  // =========================================================================

  describe('tool events persistence', () => {
    it('includes tool use events in the persisted assistant message', async () => {
      const session = await startAndBoot();
      (messageRepo.create as ReturnType<typeof vi.fn>).mockClear();

      await service.sendMessage(session.id, 'Read my file');
      await flushPromises();

      const fp = latestProc();
      // Simulate tool use followed by result
      emitLine(fp.stdout, {
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/src/app.ts' } }],
        },
      });
      emitLine(fp.stdout, {
        type: 'result',
        result: 'Here is the file content.',
        session_id: 'claude-session-abc',
      });
      await flushPromises();

      // The assistant message should include tool event summary
      const assistantCreate = (messageRepo.create as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0].role === InteractiveMessageRole.assistant
      );
      expect(assistantCreate).toBeDefined();
      const content = assistantCreate![0].content as string;
      expect(content).toContain('**Read**');
      expect(content).toContain('/src/app.ts');
      expect(content).toContain('Here is the file content.');
    });

    it('does not include tool summary when there are no tool events', async () => {
      const session = await startAndBoot();
      (messageRepo.create as ReturnType<typeof vi.fn>).mockClear();

      await service.sendMessage(session.id, 'Hello');
      await flushPromises();

      emitLine(latestProc().stdout, {
        type: 'result',
        result: 'Hi there!',
        session_id: 'claude-session-abc',
      });
      await flushPromises();

      const assistantCreate = (messageRepo.create as ReturnType<typeof vi.fn>).mock.calls.find(
        (c) => c[0].role === InteractiveMessageRole.assistant
      );
      expect(assistantCreate).toBeDefined();
      const content = assistantCreate![0].content as string;
      expect(content).toBe('Hi there!');
      // No separator or tool summary
      expect(content).not.toContain('---');
    });
  });
});
