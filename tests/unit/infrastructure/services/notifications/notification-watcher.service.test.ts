/**
 * NotificationWatcherService Unit Tests
 *
 * Tests for the polling-based service that detects agent status
 * transitions and phase completions from the database, dispatching
 * notification events via INotificationService.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AgentRun, PhaseTiming, NotificationEvent } from '@/domain/generated/output.js';
import {
  AgentRunStatus,
  NotificationEventType,
  NotificationSeverity,
} from '@/domain/generated/output.js';
import { NotificationWatcherService } from '@/infrastructure/services/notifications/notification-watcher.service.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';
import type { INotificationService } from '@/application/ports/output/services/notification-service.interface.js';

function createMockAgentRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: 'run-1',
    agentType: 'claude-code' as any,
    agentName: 'feature-agent',
    status: AgentRunStatus.running,
    prompt: 'test prompt',
    threadId: 'thread-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    featureId: 'feat-1',
    ...overrides,
  };
}

function createMockPhaseTiming(overrides: Partial<PhaseTiming> = {}): PhaseTiming {
  return {
    id: 'timing-1',
    agentRunId: 'run-1',
    phase: 'analyze',
    startedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockRunRepository(runs: AgentRun[] = []): IAgentRunRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByThreadId: vi.fn(),
    updateStatus: vi.fn(),
    findRunningByPid: vi.fn(),
    list: vi.fn().mockResolvedValue(runs),
    delete: vi.fn(),
  };
}

function createMockPhaseTimingRepository(timings: PhaseTiming[] = []): IPhaseTimingRepository {
  return {
    save: vi.fn(),
    update: vi.fn(),
    findByRunId: vi.fn().mockResolvedValue(timings),
    findByFeatureId: vi.fn(),
  };
}

function createMockNotificationService(): INotificationService & {
  receivedEvents: NotificationEvent[];
} {
  const receivedEvents: NotificationEvent[] = [];
  return {
    receivedEvents,
    notify: vi.fn((event: NotificationEvent) => {
      receivedEvents.push(event);
    }),
  };
}

describe('NotificationWatcherService', () => {
  let runRepo: IAgentRunRepository;
  let phaseRepo: IPhaseTimingRepository;
  let notificationService: ReturnType<typeof createMockNotificationService>;
  let watcher: NotificationWatcherService;

  beforeEach(() => {
    vi.useFakeTimers();

    runRepo = createMockRunRepository();
    phaseRepo = createMockPhaseTimingRepository();
    notificationService = createMockNotificationService();
    watcher = new NotificationWatcherService(runRepo, phaseRepo, notificationService);
  });

  afterEach(() => {
    watcher.stop();
    vi.useRealTimers();
  });

  describe('start/stop lifecycle', () => {
    it('should poll repository at configured interval', async () => {
      vi.mocked(runRepo.list).mockResolvedValue([]);

      watcher.start();

      // First poll happens immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(runRepo.list).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(3000);
      expect(runRepo.list).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(3000);
      expect(runRepo.list).toHaveBeenCalledTimes(3);
    });

    it('should stop polling when stop() is called', async () => {
      vi.mocked(runRepo.list).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(runRepo.list).toHaveBeenCalledTimes(1);

      watcher.stop();

      await vi.advanceTimersByTimeAsync(10000);
      expect(runRepo.list).toHaveBeenCalledTimes(1);
    });
  });

  describe('status transition detection', () => {
    it('should emit agentStarted event when run transitions to running', async () => {
      const run = createMockAgentRun({
        id: 'run-1',
        status: AgentRunStatus.running,
        featureId: 'feat-1',
      });

      vi.mocked(runRepo.list).mockResolvedValue([run]);
      vi.mocked(phaseRepo.findByRunId).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(notificationService.receivedEvents).toHaveLength(1);
      expect(notificationService.receivedEvents[0]!.eventType).toBe(
        NotificationEventType.AgentStarted
      );
      expect(notificationService.receivedEvents[0]!.severity).toBe(NotificationSeverity.Info);
      expect(notificationService.receivedEvents[0]!.agentRunId).toBe('run-1');
    });

    it('should emit agentCompleted event when run transitions to completed', async () => {
      const runningRun = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.running });
      const completedRun = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.completed });

      vi.mocked(runRepo.list)
        .mockResolvedValueOnce([runningRun])
        .mockResolvedValueOnce([completedRun]);
      vi.mocked(phaseRepo.findByRunId).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      notificationService.receivedEvents.length = 0;

      await vi.advanceTimersByTimeAsync(3000);

      expect(notificationService.receivedEvents).toHaveLength(1);
      expect(notificationService.receivedEvents[0]!.eventType).toBe(
        NotificationEventType.AgentCompleted
      );
      expect(notificationService.receivedEvents[0]!.severity).toBe(NotificationSeverity.Success);
    });

    it('should emit agentFailed event when run transitions to failed', async () => {
      const runningRun = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.running });
      const failedRun = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.failed });

      vi.mocked(runRepo.list)
        .mockResolvedValueOnce([runningRun])
        .mockResolvedValueOnce([failedRun]);
      vi.mocked(phaseRepo.findByRunId).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      notificationService.receivedEvents.length = 0;

      await vi.advanceTimersByTimeAsync(3000);

      expect(notificationService.receivedEvents).toHaveLength(1);
      expect(notificationService.receivedEvents[0]!.eventType).toBe(
        NotificationEventType.AgentFailed
      );
      expect(notificationService.receivedEvents[0]!.severity).toBe(NotificationSeverity.Error);
    });

    it('should emit waitingApproval event when run transitions to waiting_approval', async () => {
      const runningRun = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.running });
      const waitingRun = createMockAgentRun({
        id: 'run-1',
        status: AgentRunStatus.waitingApproval,
      });

      vi.mocked(runRepo.list)
        .mockResolvedValueOnce([runningRun])
        .mockResolvedValueOnce([waitingRun]);
      vi.mocked(phaseRepo.findByRunId).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      notificationService.receivedEvents.length = 0;

      await vi.advanceTimersByTimeAsync(3000);

      expect(notificationService.receivedEvents).toHaveLength(1);
      expect(notificationService.receivedEvents[0]!.eventType).toBe(
        NotificationEventType.WaitingApproval
      );
      expect(notificationService.receivedEvents[0]!.severity).toBe(NotificationSeverity.Warning);
    });

    it('should not emit duplicate event for already-seen status', async () => {
      const run = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.running });

      vi.mocked(runRepo.list).mockResolvedValue([run]);
      vi.mocked(phaseRepo.findByRunId).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(notificationService.receivedEvents).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(3000);
      expect(notificationService.receivedEvents).toHaveLength(1); // no duplicate
    });
  });

  describe('phase completion detection', () => {
    it('should emit phaseCompleted event when new phase timing has completedAt', async () => {
      const run = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.running });
      const completedPhase = createMockPhaseTiming({
        agentRunId: 'run-1',
        phase: 'analyze',
        completedAt: new Date(),
      });

      vi.mocked(runRepo.list).mockResolvedValue([run]);
      vi.mocked(phaseRepo.findByRunId)
        .mockResolvedValueOnce([]) // first poll: no completed phases
        .mockResolvedValueOnce([completedPhase]); // second poll: analyze completed

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      notificationService.receivedEvents.length = 0; // clear the agentStarted event

      await vi.advanceTimersByTimeAsync(3000);

      const phaseEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PhaseCompleted
      );
      expect(phaseEvents).toHaveLength(1);
      expect(phaseEvents[0]!.phaseName).toBe('analyze');
      expect(phaseEvents[0]!.severity).toBe(NotificationSeverity.Info);
    });

    it('should not re-emit for already seen completed phases', async () => {
      const run = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.running });
      const completedPhase = createMockPhaseTiming({
        agentRunId: 'run-1',
        phase: 'analyze',
        completedAt: new Date(),
      });

      vi.mocked(runRepo.list).mockResolvedValue([run]);
      vi.mocked(phaseRepo.findByRunId).mockResolvedValue([completedPhase]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      const initialPhaseEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PhaseCompleted
      );
      expect(initialPhaseEvents).toHaveLength(1);

      notificationService.receivedEvents.length = 0;
      await vi.advanceTimersByTimeAsync(3000);

      const secondPhaseEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PhaseCompleted
      );
      expect(secondPhaseEvents).toHaveLength(0);
    });
  });

  describe('feature name resolution', () => {
    it('should use agent run id as fallback when featureId is not set', async () => {
      const run = createMockAgentRun({
        id: 'run-1',
        status: AgentRunStatus.running,
        featureId: undefined,
      });

      vi.mocked(runRepo.list).mockResolvedValue([run]);
      vi.mocked(phaseRepo.findByRunId).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(notificationService.receivedEvents).toHaveLength(1);
      expect(notificationService.receivedEvents[0]!.featureName).toBe('Agent run-1');
    });
  });

  describe('cleanup of terminal runs', () => {
    it('should remove tracking for runs that reach terminal state', async () => {
      const runningRun = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.running });
      const completedRun = createMockAgentRun({ id: 'run-1', status: AgentRunStatus.completed });

      vi.mocked(runRepo.list)
        .mockResolvedValueOnce([runningRun])
        .mockResolvedValueOnce([completedRun])
        .mockResolvedValueOnce([]); // run is gone
      vi.mocked(phaseRepo.findByRunId).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0); // agentStarted
      await vi.advanceTimersByTimeAsync(3000); // agentCompleted
      notificationService.receivedEvents.length = 0;

      await vi.advanceTimersByTimeAsync(3000); // should not re-emit anything
      expect(notificationService.receivedEvents).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should not crash if repository throws during poll', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(runRepo.list).mockRejectedValue(new Error('DB error'));

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(consoleSpy).toHaveBeenCalled();
      expect(notificationService.receivedEvents).toHaveLength(0);

      // Should continue polling
      vi.mocked(runRepo.list).mockResolvedValue([]);
      await vi.advanceTimersByTimeAsync(3000);
      expect(runRepo.list).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });
  });
});
