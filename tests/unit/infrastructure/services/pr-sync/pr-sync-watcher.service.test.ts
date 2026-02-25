/**
 * PrSyncWatcherService Unit Tests
 *
 * Tests for the polling-based service that detects PR status and CI status
 * transitions from GitHub, updating features and dispatching notification
 * events via INotificationService.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Feature, NotificationEvent } from '@/domain/generated/output.js';
import {
  SdlcLifecycle,
  PrStatus,
  CiStatus,
  NotificationEventType,
  NotificationSeverity,
} from '@/domain/generated/output.js';
import {
  PrSyncWatcherService,
  initializePrSyncWatcher,
  getPrSyncWatcher,
  hasPrSyncWatcher,
  resetPrSyncWatcher,
} from '@/infrastructure/services/pr-sync/pr-sync-watcher.service.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import type { INotificationService } from '@/application/ports/output/services/notification-service.interface.js';
import { AgentRunStatus } from '@/domain/generated/output.js';

function createMockFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feat-1',
    name: 'Test Feature',
    userQuery: 'test',
    slug: 'test-feature',
    description: 'A test feature',
    repositoryPath: '/repo/path',
    branch: 'feat/test',
    lifecycle: SdlcLifecycle.Review,
    messages: [],
    relatedArtifacts: [],
    push: true,
    openPr: true,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    pr: {
      url: 'https://github.com/org/repo/pull/1',
      number: 1,
      status: PrStatus.Open,
      ciStatus: CiStatus.Pending,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockFeatureRepository(features: Feature[] = []): IFeatureRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdPrefix: vi.fn(),
    findBySlug: vi.fn(),
    findByParentId: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue(features),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockGitPrService(): IGitPrService {
  return {
    hasRemote: vi.fn().mockResolvedValue(true),
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    hasUncommittedChanges: vi.fn(),
    commitAll: vi.fn(),
    push: vi.fn(),
    createPr: vi.fn(),
    mergePr: vi.fn(),
    mergeBranch: vi.fn(),
    getCiStatus: vi.fn().mockResolvedValue({ status: 'pending' }),
    watchCi: vi.fn(),
    deleteBranch: vi.fn(),
    getPrDiffSummary: vi.fn(),
    listPrStatuses: vi.fn().mockResolvedValue([]),
    getFailureLogs: vi.fn().mockResolvedValue(''),
    verifyMerge: vi.fn().mockResolvedValue(false),
  };
}

function createMockAgentRunRepository(): IAgentRunRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(null),
    findByThreadId: vi.fn().mockResolvedValue(null),
    updateStatus: vi.fn(),
    findRunningByPid: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
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

describe('PrSyncWatcherService', () => {
  let featureRepo: IFeatureRepository;
  let agentRunRepo: IAgentRunRepository;
  let gitPrService: IGitPrService;
  let notificationService: ReturnType<typeof createMockNotificationService>;
  let watcher: PrSyncWatcherService;

  beforeEach(() => {
    vi.useFakeTimers();

    featureRepo = createMockFeatureRepository();
    agentRunRepo = createMockAgentRunRepository();
    gitPrService = createMockGitPrService();
    notificationService = createMockNotificationService();
    watcher = new PrSyncWatcherService(
      featureRepo,
      agentRunRepo,
      gitPrService,
      notificationService
    );
  });

  afterEach(() => {
    watcher.stop();
    vi.useRealTimers();
  });

  describe('start/stop lifecycle', () => {
    it('should set isRunning to true when started', () => {
      vi.mocked(featureRepo.list).mockResolvedValue([]);

      watcher.start();

      expect(watcher.isRunning()).toBe(true);
    });

    it('should set isRunning to false when stopped', () => {
      vi.mocked(featureRepo.list).mockResolvedValue([]);

      watcher.start();
      watcher.stop();

      expect(watcher.isRunning()).toBe(false);
    });

    it('should be no-op when start() is called while already running', async () => {
      vi.mocked(featureRepo.list).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      watcher.start(); // second start should be no-op

      await vi.advanceTimersByTimeAsync(3000);
      // Only 2 polls: one immediate + one after 3s (not 4 from double-start)
      expect(featureRepo.list).toHaveBeenCalledTimes(2);
    });

    it('should poll at configured interval', async () => {
      vi.mocked(featureRepo.list).mockResolvedValue([]);

      watcher.start();

      // First poll happens immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(featureRepo.list).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(3000);
      expect(featureRepo.list).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(3000);
      expect(featureRepo.list).toHaveBeenCalledTimes(3);
    });

    it('should stop polling when stop() is called', async () => {
      vi.mocked(featureRepo.list).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(featureRepo.list).toHaveBeenCalledTimes(1);

      watcher.stop();

      await vi.advanceTimersByTimeAsync(10000);
      expect(featureRepo.list).toHaveBeenCalledTimes(1);
    });

    it('should support custom poll interval', async () => {
      vi.mocked(featureRepo.list).mockResolvedValue([]);
      const customWatcher = new PrSyncWatcherService(
        featureRepo,
        agentRunRepo,
        gitPrService,
        notificationService,
        1000
      );

      customWatcher.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(featureRepo.list).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(featureRepo.list).toHaveBeenCalledTimes(2);

      customWatcher.stop();
    });
  });

  describe('PR status polling and transition detection', () => {
    it('should detect Open→Merged transition and update feature and agent run', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        name: 'My Feature',
        repositoryPath: '/repo/path',
        branch: 'feat/test',
        agentRunId: 'run-1',
        pr: { url: 'https://github.com/org/repo/pull/1', number: 1, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        {
          number: 1,
          state: PrStatus.Merged,
          url: 'https://github.com/org/repo/pull/1',
          headRefName: 'feat/test',
        },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).toHaveBeenCalledTimes(1);
      const updatedFeature = vi.mocked(featureRepo.update).mock.calls[0][0];
      expect(updatedFeature.pr!.status).toBe(PrStatus.Merged);
      expect(updatedFeature.lifecycle).toBe(SdlcLifecycle.Maintain);

      // Agent run should be marked as completed
      expect(agentRunRepo.updateStatus).toHaveBeenCalledWith('run-1', AgentRunStatus.completed);
    });

    it('should skip agent run update when feature has no agentRunId', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        name: 'My Feature',
        repositoryPath: '/repo/path',
        branch: 'feat/test',
        pr: { url: 'https://github.com/org/repo/pull/1', number: 1, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        {
          number: 1,
          state: PrStatus.Merged,
          url: 'https://github.com/org/repo/pull/1',
          headRefName: 'feat/test',
        },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).toHaveBeenCalledTimes(1);
      expect(agentRunRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should detect Open→Closed transition and update feature without lifecycle change', async () => {
      const feature = createMockFeature({
        id: 'feat-2',
        name: 'Closed Feature',
        repositoryPath: '/repo/path',
        branch: 'feat/closed',
        pr: { url: 'https://github.com/org/repo/pull/2', number: 2, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        {
          number: 2,
          state: PrStatus.Closed,
          url: 'https://github.com/org/repo/pull/2',
          headRefName: 'feat/closed',
        },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).toHaveBeenCalledTimes(1);
      const updatedFeature = vi.mocked(featureRepo.update).mock.calls[0][0];
      expect(updatedFeature.pr!.status).toBe(PrStatus.Closed);
      expect(updatedFeature.lifecycle).toBe(SdlcLifecycle.Review); // stays Review
    });

    it('should not call update when PR status has not changed', async () => {
      const feature = createMockFeature({
        id: 'feat-3',
        repositoryPath: '/repo/path',
        pr: {
          url: 'https://github.com/org/repo/pull/3',
          number: 3,
          status: PrStatus.Open,
          ciStatus: CiStatus.Pending,
        },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        {
          number: 3,
          state: PrStatus.Open,
          url: 'https://github.com/org/repo/pull/3',
          headRefName: 'feat/test',
        },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).not.toHaveBeenCalled();
    });

    it('should group features by repositoryPath for batch PR queries', async () => {
      const feature1 = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/a',
        pr: { url: 'https://github.com/org/repo-a/pull/1', number: 1, status: PrStatus.Open },
        branch: 'feat/a',
      });
      const feature2 = createMockFeature({
        id: 'feat-2',
        repositoryPath: '/repo/a',
        pr: { url: 'https://github.com/org/repo-a/pull/2', number: 2, status: PrStatus.Open },
        branch: 'feat/b',
      });
      const feature3 = createMockFeature({
        id: 'feat-3',
        repositoryPath: '/repo/b',
        pr: { url: 'https://github.com/org/repo-b/pull/1', number: 1, status: PrStatus.Open },
        branch: 'feat/c',
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature1, feature2, feature3]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: '' },
        { number: 2, state: PrStatus.Open, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      // One call per unique repositoryPath
      expect(gitPrService.listPrStatuses).toHaveBeenCalledTimes(2);
      expect(gitPrService.listPrStatuses).toHaveBeenCalledWith('/repo/a');
      expect(gitPrService.listPrStatuses).toHaveBeenCalledWith('/repo/b');
    });

    it('should prune features that left Review from tracking map', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/path',
        pr: { url: 'https://github.com/org/repo/pull/1', number: 1, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list)
        .mockResolvedValueOnce([feature]) // first poll: feature in Review
        .mockResolvedValueOnce([]); // second poll: feature no longer in Review
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(3000);

      // On second poll with empty list, no API calls should be made
      // listPrStatuses called only on first poll
      expect(gitPrService.listPrStatuses).toHaveBeenCalledTimes(1);
    });

    it('should emit PrMerged notification with correct fields including featureId and agentRunId', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        name: 'Merged Feature',
        agentRunId: 'run-1',
        repositoryPath: '/repo/path',
        pr: { url: 'https://github.com/org/repo/pull/1', number: 1, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        {
          number: 1,
          state: PrStatus.Merged,
          url: 'https://github.com/org/repo/pull/1',
          headRefName: 'feat/test',
        },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      const prEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PrMerged
      );
      expect(prEvents).toHaveLength(1);
      expect(prEvents[0]!.featureId).toBe('feat-1');
      expect(prEvents[0]!.agentRunId).toBe('run-1');
      expect(prEvents[0]!.featureName).toBe('Merged Feature');
      expect(prEvents[0]!.severity).toBe(NotificationSeverity.Success);
    });

    it('should emit PrClosed notification with correct fields including featureId', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        name: 'Closed Feature',
        agentRunId: 'run-1',
        repositoryPath: '/repo/path',
        pr: { url: 'https://github.com/org/repo/pull/1', number: 1, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        {
          number: 1,
          state: PrStatus.Closed,
          url: 'https://github.com/org/repo/pull/1',
          headRefName: 'feat/test',
        },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      const prEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PrClosed
      );
      expect(prEvents).toHaveLength(1);
      expect(prEvents[0]!.featureId).toBe('feat-1');
      expect(prEvents[0]!.agentRunId).toBe('run-1');
      expect(prEvents[0]!.featureName).toBe('Closed Feature');
      expect(prEvents[0]!.severity).toBe(NotificationSeverity.Warning);
    });

    it('should discover merged PR by branch name when feature has no PR data', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        name: 'Externally Merged',
        repositoryPath: '/repo/path',
        branch: 'feat/external',
        agentRunId: 'run-1',
        pr: undefined, // No PR data on the feature
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        {
          number: 42,
          state: PrStatus.Merged,
          url: 'https://github.com/org/repo/pull/42',
          headRefName: 'feat/external',
        },
      ]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      // Feature should be updated with discovered PR data and lifecycle → Maintain
      expect(featureRepo.update).toHaveBeenCalledTimes(1);
      const updatedFeature = vi.mocked(featureRepo.update).mock.calls[0][0];
      expect(updatedFeature.pr!.url).toBe('https://github.com/org/repo/pull/42');
      expect(updatedFeature.pr!.number).toBe(42);
      expect(updatedFeature.pr!.status).toBe(PrStatus.Merged);
      expect(updatedFeature.lifecycle).toBe(SdlcLifecycle.Maintain);

      // Agent run should be marked as completed
      expect(agentRunRepo.updateStatus).toHaveBeenCalledWith('run-1', AgentRunStatus.completed);

      // PrMerged notification should be emitted
      const prEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PrMerged
      );
      expect(prEvents).toHaveLength(1);
      expect(prEvents[0]!.featureId).toBe('feat-1');
    });

    it('should discover open PR by branch name and populate feature PR data', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        name: 'External PR',
        repositoryPath: '/repo/path',
        branch: 'feat/external',
        pr: undefined,
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        {
          number: 10,
          state: PrStatus.Open,
          url: 'https://github.com/org/repo/pull/10',
          headRefName: 'feat/external',
        },
      ]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      // Feature should be updated with discovered PR data (stays in Review since Open)
      expect(featureRepo.update).toHaveBeenCalledTimes(1);
      const updatedFeature = vi.mocked(featureRepo.update).mock.calls[0][0];
      expect(updatedFeature.pr!.url).toBe('https://github.com/org/repo/pull/10');
      expect(updatedFeature.pr!.number).toBe(10);
      expect(updatedFeature.pr!.status).toBe(PrStatus.Open);
      expect(updatedFeature.lifecycle).toBe(SdlcLifecycle.Review); // stays Review
    });

    it('should not update feature when no matching PR found by branch', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/path',
        branch: 'feat/no-match',
        pr: undefined,
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: 'feat/other-branch' },
      ]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).not.toHaveBeenCalled();
    });

    it('should not emit duplicate notification on subsequent polls with same status', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/path',
        pr: { url: 'https://github.com/org/repo/pull/1', number: 1, status: PrStatus.Open },
      });

      // Feature merged on first poll, then removed from Review on second
      vi.mocked(featureRepo.list)
        .mockResolvedValueOnce([feature])
        .mockResolvedValueOnce([{ ...feature, lifecycle: SdlcLifecycle.Maintain }])
        .mockResolvedValueOnce([]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Merged, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(notificationService.receivedEvents).toHaveLength(1); // PrMerged

      notificationService.receivedEvents.length = 0;
      await vi.advanceTimersByTimeAsync(3000);
      // Feature is still returned by list but state hasn't changed in map
      // No duplicate notification since it's already tracked as Merged
      const prMergedEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PrMerged
      );
      expect(prMergedEvents).toHaveLength(0);
    });
  });

  describe('CI status polling and transition detection', () => {
    it('should detect CI Pending→Success and update feature', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/path',
        branch: 'feat/test',
        pr: {
          url: 'https://github.com/org/repo/pull/1',
          number: 1,
          status: PrStatus.Open,
          ciStatus: CiStatus.Pending,
        },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'success' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).toHaveBeenCalledTimes(1);
      const updatedFeature = vi.mocked(featureRepo.update).mock.calls[0][0];
      expect(updatedFeature.pr!.ciStatus).toBe(CiStatus.Success);
    });

    it('should detect CI Pending→Failure and update feature', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/path',
        branch: 'feat/test',
        pr: {
          url: 'https://github.com/org/repo/pull/1',
          number: 1,
          status: PrStatus.Open,
          ciStatus: CiStatus.Pending,
        },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'failure' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).toHaveBeenCalledTimes(1);
      const updatedFeature = vi.mocked(featureRepo.update).mock.calls[0][0];
      expect(updatedFeature.pr!.ciStatus).toBe(CiStatus.Failure);
    });

    it('should emit PrChecksPassed notification on CI success', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        name: 'CI Pass Feature',
        repositoryPath: '/repo/path',
        branch: 'feat/test',
        pr: {
          url: 'https://github.com/org/repo/pull/1',
          number: 1,
          status: PrStatus.Open,
          ciStatus: CiStatus.Pending,
        },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'success' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      const ciEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PrChecksPassed
      );
      expect(ciEvents).toHaveLength(1);
      expect(ciEvents[0]!.featureName).toBe('CI Pass Feature');
      expect(ciEvents[0]!.severity).toBe(NotificationSeverity.Success);
    });

    it('should emit PrChecksFailed notification on CI failure', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        name: 'CI Fail Feature',
        repositoryPath: '/repo/path',
        branch: 'feat/test',
        pr: {
          url: 'https://github.com/org/repo/pull/1',
          number: 1,
          status: PrStatus.Open,
          ciStatus: CiStatus.Pending,
        },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'failure' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      const ciEvents = notificationService.receivedEvents.filter(
        (e) => e.eventType === NotificationEventType.PrChecksFailed
      );
      expect(ciEvents).toHaveLength(1);
      expect(ciEvents[0]!.featureName).toBe('CI Fail Feature');
      expect(ciEvents[0]!.severity).toBe(NotificationSeverity.Error);
    });

    it('should not trigger update when CI status is unchanged', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/path',
        branch: 'feat/test',
        pr: {
          url: 'https://github.com/org/repo/pull/1',
          number: 1,
          status: PrStatus.Open,
          ciStatus: CiStatus.Pending,
        },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).not.toHaveBeenCalled();
    });

    it('should handle getCiStatus errors gracefully and continue', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const feature1 = createMockFeature({
        id: 'feat-1',
        name: 'Feature 1',
        repositoryPath: '/repo/path',
        branch: 'feat/a',
        pr: { url: 'https://github.com/org/repo/pull/1', number: 1, status: PrStatus.Open },
      });
      const feature2 = createMockFeature({
        id: 'feat-2',
        name: 'Feature 2',
        repositoryPath: '/repo/path',
        branch: 'feat/b',
        pr: { url: 'https://github.com/org/repo/pull/2', number: 2, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature1, feature2]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Merged, url: '', headRefName: '' },
        { number: 2, state: PrStatus.Open, url: '', headRefName: '' },
      ]);
      vi.mocked(gitPrService.getCiStatus)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ status: 'success' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      // Feature 1 should still be updated for PR merge despite CI error
      expect(featureRepo.update).toHaveBeenCalled();
      // Feature 2 CI success should be processed
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('error handling and edge cases', () => {
    it('should not make API calls when no features are in Review', async () => {
      vi.mocked(featureRepo.list).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(gitPrService.listPrStatuses).not.toHaveBeenCalled();
      expect(gitPrService.getCiStatus).not.toHaveBeenCalled();
    });

    it('should still poll GitHub for features without PR data (for branch-based discovery)', async () => {
      const featureNoPr = createMockFeature({
        id: 'feat-no-pr',
        branch: 'feat/no-pr',
        pr: undefined,
      });

      vi.mocked(featureRepo.list).mockResolvedValue([featureNoPr]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      // Should poll GitHub to discover PRs by branch
      expect(gitPrService.listPrStatuses).toHaveBeenCalledWith('/repo/path');
    });

    it('should skip features with missing repositoryPath', async () => {
      const featureMissingRepo = createMockFeature({
        id: 'feat-no-repo',
        repositoryPath: '',
        pr: { url: 'https://github.com/org/repo/pull/1', number: 1, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([featureMissingRepo]);

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(gitPrService.listPrStatuses).not.toHaveBeenCalled();
    });

    it('should skip feature when PR number is not found in listPrStatuses response', async () => {
      const feature = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/path',
        pr: {
          url: 'https://github.com/org/repo/pull/99',
          number: 99,
          status: PrStatus.Open,
          ciStatus: CiStatus.Pending,
        },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature]);
      vi.mocked(gitPrService.listPrStatuses).mockResolvedValue([
        { number: 1, state: PrStatus.Open, url: '', headRefName: '' }, // PR 99 not in response
      ]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(featureRepo.update).not.toHaveBeenCalled();
    });

    it('should isolate listPrStatuses errors per repository', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const feature1 = createMockFeature({
        id: 'feat-1',
        repositoryPath: '/repo/a',
        branch: 'feat/a',
        pr: { url: 'https://github.com/org/repo-a/pull/1', number: 1, status: PrStatus.Open },
      });
      const feature2 = createMockFeature({
        id: 'feat-2',
        repositoryPath: '/repo/b',
        branch: 'feat/b',
        pr: { url: 'https://github.com/org/repo-b/pull/1', number: 1, status: PrStatus.Open },
      });

      vi.mocked(featureRepo.list).mockResolvedValue([feature1, feature2]);
      vi.mocked(gitPrService.listPrStatuses)
        .mockRejectedValueOnce(new Error('Auth failure for repo a'))
        .mockResolvedValueOnce([{ number: 1, state: PrStatus.Merged, url: '', headRefName: '' }]);
      vi.mocked(gitPrService.getCiStatus).mockResolvedValue({ status: 'pending' });

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      // Repo b should still be processed despite repo a failure
      expect(featureRepo.update).toHaveBeenCalled();
      const updatedFeature = vi.mocked(featureRepo.update).mock.calls[0][0];
      expect(updatedFeature.id).toBe('feat-2');
      expect(updatedFeature.pr!.status).toBe(PrStatus.Merged);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should catch and log top-level poll errors', async () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(featureRepo.list).mockRejectedValue(new Error('DB connection error'));

      watcher.start();
      await vi.advanceTimersByTimeAsync(0);

      expect(consoleSpy).toHaveBeenCalled();
      expect(notificationService.receivedEvents).toHaveLength(0);

      // Should continue polling on next cycle
      vi.mocked(featureRepo.list).mockResolvedValue([]);
      await vi.advanceTimersByTimeAsync(3000);
      expect(featureRepo.list).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });
  });

  describe('singleton accessors', () => {
    beforeEach(() => {
      resetPrSyncWatcher();
    });

    afterEach(() => {
      resetPrSyncWatcher();
    });

    it('should initialize and return watcher via get', () => {
      initializePrSyncWatcher(featureRepo, agentRunRepo, gitPrService, notificationService);

      expect(hasPrSyncWatcher()).toBe(true);

      const instance = getPrSyncWatcher();
      expect(instance).toBeInstanceOf(PrSyncWatcherService);
    });

    it('should throw when initializing twice', () => {
      initializePrSyncWatcher(featureRepo, agentRunRepo, gitPrService, notificationService);

      expect(() => {
        initializePrSyncWatcher(featureRepo, agentRunRepo, gitPrService, notificationService);
      }).toThrow('PR sync watcher already initialized');
    });

    it('should throw when getting without initialization', () => {
      expect(() => {
        getPrSyncWatcher();
      }).toThrow('PR sync watcher not initialized');
    });

    it('should report false for hasPrSyncWatcher when not initialized', () => {
      expect(hasPrSyncWatcher()).toBe(false);
    });

    it('should stop and clear instance on reset', () => {
      initializePrSyncWatcher(featureRepo, agentRunRepo, gitPrService, notificationService);
      const instance = getPrSyncWatcher();
      vi.mocked(featureRepo.list).mockResolvedValue([]);
      instance.start();

      expect(instance.isRunning()).toBe(true);

      resetPrSyncWatcher();

      expect(instance.isRunning()).toBe(false);
      expect(hasPrSyncWatcher()).toBe(false);
    });
  });
});
